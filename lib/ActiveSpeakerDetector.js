const Native		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const Emitter		= require("medooze-event-emitter");

/**
 * ActiveSpeakerDetector accumulate received voice activity and fires an event when it changes
 */
class ActiveSpeakerDetector extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor()
	{
		//Init emitter
		super();
		
		//List of the tracks associated to the speakers
		this.maxId  = 1;
		this.ids    = new WeakMap();
		this.tracks = new Map();
		
		//Listen for speaker changes		
		this.onactivespeakerchanged = (id) => {
			//Get track
			const track = this.tracks.get(id);
			//Prevent race condition
			if (track)
				//Emit event
				this.emit("activespeakerchanged",track);
		};
		
		//Create native detector
		this.detector = new Native.ActiveSpeakerDetectorFacade(this);
		
		//The listener for attached tracks end event
		this.onTrackStopped = (track) => {
			//Remove track
			this.removeSpeaker(track);
		};
	}
	
	/**
	 * Set minimum period between active speaker changes
	 * @param {Number} minChangePeriod
	 */
	setMinChangePeriod(minChangePeriod)
	{
		this.detector.SetMinChangePeriod(minChangePeriod);
	}
	
	/**
	 * Maximux activity score accumulated by an speaker
	 * @param {Number} maxAcummulatedScore
	 */
	setMaxAccumulatedScore(maxAcummulatedScore)
	{
		this.detector.SetMaxAccumulatedScore(maxAcummulatedScore);
	}
	
	/**
	 * Minimum db level to not be considered as muted
	 * @param {Number} noiseGatingThreshold
	 */
	setNoiseGatingThreshold(noiseGatingThreshold)
	{
		this.detector.SetNoiseGatingThreshold(noiseGatingThreshold);
	}
	
	/**
	 * Set minimum activation score to be electible as active speaker
	 * @param {Number} minActivationScore
	 */
	setMinActivationScore(minActivationScore)
	{
		this.detector.SetMinActivationScore(minActivationScore);
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
		//Get first source
		const source = track.encodings.values().next().value.source;
		//Check source
		if (!source)
			//Error
			throw new Error("Could not find source for track");
		
		//Generate a new id
		const id = this.maxId++;
		//Store on maps
		this.ids.set(track,id);
		this.tracks.set(id,track);
		//Start listening to it
		this.detector.AddIncomingSourceGroup(source[SharedPointer.Pointer], id);
		//Singal track is attached
		track.attached();
		
		//Listen for stop events
		track.once("stopped", this.onTrackStopped);

	}
	
	/**
	 * Remove track from speaker detection
	 * @param {IncomingStreamTrakc} track
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
		
		//Get first source
		const source = track.encodings.values().next().value.source;
		//Check source
		if (!source)
			//Error
			throw new Error("Could not find sourc for track");
		
		//Stop listening to it
		this.detector.RemoveIncomingSourceGroup(source[SharedPointer.Pointer]);

		//Singal track is detached
		track.detached();
		
		//Delete track
		this.tracks.delete(id);
		
		//Stopp listening events
		track.off("stopped", this.onTrackStopped);
	}
	
	
	/**
	 * Stop this transponder, will dettach the OutgoingStreamTrack
	 */
	stop()
	{
		//Stop listening for events, as they might have been queued
		this.onactivespeakerchanged = ()=>{};
		//Stop listening on any track
		for (const track of this.tracks.values())
			//remove track
			this.removeSpeaker (track);
	
		this.emit("stopped");

		//Stop emitter
		super.stop();
		
		//Remove native reference, so destructor is called on GC
		this.detector = null;
	}
	
};


module.exports = ActiveSpeakerDetector;
