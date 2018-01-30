const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const OutgoingStreamTrack	= require("./OutgoingStreamTrack");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;

/**
 * The incoming streams represent the media stream sent to a remote peer.
 */
class OutgoingStream
{
	constructor(transport,info)
	{
		//Store id
		this.id = info.id;
		this.info = info;
		
		//Store native transport
		this.transport = transport;
		
		//Store sources
		this.tracks = new Map();
		
		//For each tracks
		for (let track of info.getTracks().values())
		{
			//Is it audio or video
			const type	 = track.getMedia()==="audio" ? 0 : 1;
			//Create incoming track
			const source = new Native.RTPOutgoingSourceGroup(type);

			//Set source data
			source.media.ssrc = track.getSSRCs ()[0];

			//Check groups
			const FID    = track.getSourceGroup("FID");
			const FEC_FR = track.getSourceGroup("FEC-FR");

			//Set rtx ssrc
			source.rtx.ssrc = FID ? FID.getSSRCs()[1] : 0;

			//Set rtx ssrc
			source.fec.ssrc = FEC_FR ? FEC_FR.getSSRCs()[1] : 0;

			//Add it to transport
			if (!this.transport.AddOutgoingSourceGroup(source))
				//Launch exception
				throw new Error("Could not add incoming source group to native transport");
			
			//Create new track
			const outgoingStreamTrack = new OutgoingStreamTrack(Native.TransportToSender(transport),track,source);
			
			//Add listener
			outgoingStreamTrack.on("stop",()=>{
				//REmove from map
				this.tracks.delete(track.getId());
				//Remove from transport
				this.transport.RemoveOutgoingSourceGroup(source);
			});
			//Add it to map
			this.tracks.set(track.getId(),outgoingStreamTrack);
		}
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Listen media from the incoming stream and send it to the remote peer of the associated transport.
	 * @param {IncomingStream} incomingStream - The incoming stream to listen media for
	 * @returns {Array<Transponder>} Track transponders array
	 */
	attachTo(incomingStream)
	{
		//Dettach
		this.detach();
		
		//The transponders
		const transponders = [];
		
		//Get all of our audio streams
		const audio = this.getAudioTracks();
		
		//If we have any
		if (audio.length)
		{
			//Get incoming audiotracks
			const tracks = incomingStream.getAudioTracks();
			//Try to match each ones
			for (let i=0;i<audio.length && i<tracks.length;++i)
				//Attach them
				transponders.push(audio[i].attachTo(tracks[i]));
		}
		
		//Get all of our audio streams
		const video = this.getVideoTracks();
		
		//If we have any
		if (video.length)
		{
			//Get incoming audiotracks
			const tracks = incomingStream.getVideoTracks();
			//Try to match each ones
			for (let i=0;i<video.length && i<tracks.length;++i)
				//Attach them and get transponder
				transponders.push(video[i].attachTo(tracks[i]));
		}
		
		//Return transponders array
		return transponders;
	}
	
	/**
	 * Stop listening for media 
	 */
	detach()
	{
		//For each track
		for (let track of this.tracks.values())
			//Detach it
			track.detach();
	}
	/**
	 * Get the stream info object for signaling the ssrcs and stream info on the SDP to the remote peer
	 * @returns {StreamInfo} The stream info object
	 */
	getStreamInfo()
	{
		return this.info;
	}
	
	/**
	 * The media stream id as announced on the SDP
	 * @returns {String}
	 */
	getId() 
	{
		return this.id;
	}

	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStream} 
	 */
	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter.on.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Remove event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {OutgoingStream} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {Array|OutgoingStreamTracks}	- Array of tracks
	 */
	getAudioTracks() 
	{
		var audio = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="audio")
				//Append to tracks
				audio.push(track);
		//Return all tracks
		return audio;
	}
	
	/**
	 * Get an array of the media stream video tracks
	 * @returns {Array|OutgoingStreamTrack}	- Array of tracks
	 */
	getVideoTracks() 
	{
		var video = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="video")
				//Append to tracks
				video.push(track);
		//Return all tracks
		return video;
	}
	
	stop()
	{
		//Don't call it twice
		if (!this.transport) return;
		
		//Stop all streams it will detach them
		for (let track of this.tracks.values())
			//Stop track
			track.stop();
		
		//Clear tracks jic
		this.tracks.clear();
		
		/**
		* OutgoingStream stopped event
		*
		* @event OutgoingStream#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
};

module.exports = OutgoingStream;