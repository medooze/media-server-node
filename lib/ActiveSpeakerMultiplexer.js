const Native	= require("./Native");
const Emitter	= require("medooze-event-emitter");
const IncomingStreamTrack = require("./IncomingStreamTrack");
const OutgoingStreamTrack = require("./OutgoingStreamTrack");
const Transponder = require("./Transponder");
const OutgoingStream = require("./OutgoingStream");
const SharedPointer	= require("./SharedPointer")

/**
 * @typedef {Object} Multiplex
 * @property {number} multiplexId
 * @property {OutgoingStreamTrack} outgoingTrack
 * @property {Transponder} transponder
 */

/**
 * @typedef {Object} ActiveSpeakerMultiplexerEvents
 * @property {() => void} stopped
 * @property {(incomingStreamTrack: IncomingStreamTrack, outgoingStreamTrack: OutgoingStreamTrack) => void} activespeakerchanged New active speaker detected (`incomingStreamTrack` is track that has been voice activated, `outgoingStreamTrack` is track that has been multiplexed into)
 * @property {(outgoingStreamTrack: OutgoingStreamTrack) => void} noactivespeaker Active speaker removed (`outgoingStreamTrack` is track with no active speaker)
 */

/**
 * ActiveSpeakerMultiplexer multiplex multiple incoming audio tracks into fewer outgoing tracks based on voice activity.
 * @extends {Emitter<ActiveSpeakerMultiplexerEvents>}
 */
class ActiveSpeakerMultiplexer extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {Native.TimeService} */ timeService,
		/** @type {OutgoingStream | OutgoingStreamTrack[]} */ streamOrTracks)
	{
		//Init emitter
		super();
		
		//List of the tracks associated to the speakers
		this.maxId	= 1;
		this.ids	= /** @type {WeakMap<IncomingStreamTrack, number>} */ (new WeakMap());
		this.speakers	= /** @type {Map<Number, IncomingStreamTrack>} */ (new Map());
		this.multiplex  = /** @type {Map<Number, Multiplex>} */ (new Map());
		
		//Listen for speaker changes		
		this.onactivespeakerchanged = (
			/** @type {number} */ speakerId,
			/** @type {number} */ multiplexeId,
		) => {
			//Get speaker track
			const incomingStreamTrack	= this.speakers.get(speakerId);
			const outgoingStreamTrack	= this.multiplex.get(multiplexeId)?.outgoingTrack;
			//Prevent race conditions
			if (incomingStreamTrack && outgoingStreamTrack)
				//Emit event
				this.emit("activespeakerchanged",incomingStreamTrack,outgoingStreamTrack);
		};
		this.onactivespeakerremoved = (/** @type {number} */ multiplexeId) => {
			//Get multiplexed track
			const outgoingStreamTrack	= this.multiplex.get(multiplexeId)?.outgoingTrack;
			//Prevent race condition
			if (outgoingStreamTrack)
				//Emit event
				this.emit("noactivespeaker",outgoingStreamTrack);

		};

		
		
		//The listener for attached tracks end event
		this.onTrackStopped = (/** @type {IncomingStreamTrack} */ track) => {
			//Remove track
			this.removeSpeaker(track);
		};
		//The listener for attached tracks end event
		this.onOutgoingTrackStopped = (/** @type {OutgoingStreamTrack} */ outgoingTrack) => {
			//Find track from multiplex
			for (const [multiplexId,multiplex] of this.multiplex)
			{
				//If same track
				if (multiplex.outgoingTrack == outgoingTrack)
				{
					//Remove from multiplexer
					this.multiplexer.RemoveRTPStreamTransponder(multiplex.transponder.transponder);
					//remove it
					this.multiplex.delete(multiplexId);
					//Done
					break;
				}
			}
		};

		//Create native multiplexer
		this.multiplexer = SharedPointer(new Native.ActiveSpeakerMultiplexerFacadeShared(timeService,this));

		//Get outgoing tracks
		//@ts-expect-error
		const outgoingTracks = /** @type {OutgoingStreamTrack[]} */ (streamOrTracks.getTracks ? streamOrTracks.getTracks("audio") : streamOrTracks);

		let multiplexId = 1;
		//For each outgoing track
		for (const outgoingTrack of outgoingTracks)
		{
			//Ensure it is an audio track
			if (outgoingTrack.getMedia().toLowerCase()!="audio")
				//Error
				throw new Error("Unsuported media type track");
			//Add stop listener
			outgoingTrack.once("stopped",this.onOutgoingTrackStopped);
			//Detach it (jic)
			outgoingTrack.detach();
			
			//Create transpoder if not already created
			const transponder = outgoingTrack.createTransponder();

			//Add to multiplex map
			this.multiplex.set(multiplexId,{multiplexId,outgoingTrack,transponder});
			//Add to multiplexer
			this.multiplexer.AddRTPStreamTransponder(transponder.transponder, multiplexId);
			//next
			multiplexId++;
		}
	}
	
	/**
	 * Maximux activity score accumulated by an speaker
	 * @param {Number} maxAcummulatedScore
	 */
	setMaxAccumulatedScore(maxAcummulatedScore)
	{
		this.multiplexer.SetMaxAccumulatedScore(maxAcummulatedScore);
	}
	
	/**
	 * Minimum db level to not be considered as muted
	 * @param {Number} noiseGatingThreshold
	 */
	setNoiseGatingThreshold(noiseGatingThreshold)
	{
		this.multiplexer.SetNoiseGatingThreshold(noiseGatingThreshold);
	}
	
	/**
	 * Set minimum activation score to be electible as active speaker
	 * @param {Number} minActivationScore
	 */
	setMinActivationScore(minActivationScore)
	{
		this.multiplexer.SetMinActivationScore(minActivationScore);
	}
	
	/**
	 * Add incoming track for speaker detection
	 * @param {IncomingStreamTrack} track
	 */
	addSpeaker(track) 
	{
		//Ensure that we don't have this trak already
		if (this.ids.has(track))
			//Error
			throw new Error("Track already added");
		//Get first encoding
		const encoding = track.getDefaultEncoding();
		//Check source
		if (!encoding.source)
			//Error
			throw new Error("Could not find source for track");
		
		//Generate a new id
		const id = this.maxId++;

		//Store on maps
		this.ids.set(track,id);
		this.speakers.set(id,track);
		//Start listening to it
		this.multiplexer.AddIncomingSourceGroup(encoding.source, id);
		//Singal track is attached
		track.attached();
		//Listen for stop events
		track.once("stopped", this.onTrackStopped);

	}
	
	/**
	 * Remove track from speaker detection
	 * @param {IncomingStreamTrack} track
	 */
	removeSpeaker(track) 
	{
		//Get id
		const id = this.ids.get(track);
		
		//Ensure we have it
		if (!id)
			throw new Error("Could not find track");

		//Delete id
		this.ids.delete(track);
		//Delete speaker
		this.speakers.delete(id);
		
		//Get first source
		const source = track.getDefaultEncoding().source;
		//Check source
		if (!source)
			//Error
			throw new Error("Could not find sourc for track");
		
		//Stop listening to it
		this.multiplexer.RemoveIncomingSourceGroup(source);
		
		//Singal track is detached
		track.detached();

		//Delete track
		this.speakers.delete(id);
		
		//Stopp listening events
		track.off("stopped", this.onTrackStopped);
	}
	
	/**
	 * Stop this transponder, will dettach the OutgoingStreamTrack
	 */
	stop()
	{
		//Don't stop twice
		if (this.stopped)
			//Do nothing
			return;

		//Stopped
		this.stopped = true;

		//Stop listening for events, as they might have been queued
		this.onactivespeakerchanged = ()=>{};
		this.onactivespeakerremoved = ()=>{};

		//Remove outgoing track listener
		for (const [multiplexId,multiplex] of this.multiplex)
		{
			//Remove from multiplexer
			this.multiplexer.RemoveRTPStreamTransponder(multiplex.transponder.transponder);
			//Remove event
			multiplex.outgoingTrack.off("stopped",this.onOutgoingTrackStopped);
		}
		//Cleare multiplexed
		this.multiplex.clear();

		//Remove speakers
		for (const [speakerId,track] of this.speakers)
			//Remove it
			this.removeSpeaker(track) 

		this.emit("stopped");

		//Stop multiplexer
		this.multiplexer.Stop();

		//Stop emitter
		super.stop();
		
		//Remove native reference, so destructor is called on GC
		//@ts-expect-error
		this.multiplexer = null;
		//@ts-expect-error
		this.multiplex = null;
		//@ts-expect-error
		this.speakers = null;
	}
	
};


module.exports = ActiveSpeakerMultiplexer;
