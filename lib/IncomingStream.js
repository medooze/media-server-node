const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;

/**
 * The incoming streams represent the recived media stream from a remote peer.
 */
class IncomingStream
{
	constructor(transport,info)
	{
		//Store id
		this.id = info.id;
		
		//Store native transport
		this.transport = transport;
		
		//Store sources
		this.tracks = new Map();
		
		//For each tracks
		for (let track of info.getTracks().values())
		{
			//Is it audio or video
			const type	 = track.getMedia()==="audio" ? 0 : 1;
			
			//The map of incoming sources
			const sources	 = {};
			
			//Get encodings
			const encodings	 = track.getEncodings();
			
			//If it is a simulcast encoding
			if (encodings.length)
			{
				//For each encoding
				for (let i=0; i<encodings.length; ++i)
				{
					//For each alternative
					for (let j=0; j<encodings[i].length; ++j)
					{
						//Create single incoming source
						const source = new native.RTPIncomingSourceGroup(type);
						
						//Get rid
						const rid = encodings[i][j].getId();
						
						//Set rtp stream id
						source.rid = new native.StringFacade(rid);

						//Add it to transport
						if (!this.transport.AddIncomingSourceGroup(source))
							//Launch exception
							throw new Error("Could not add incoming source group to native transport");
						//Append to sources
						sources[rid] = source;
					}
				}
			} else {
				//Create single incoming source
				const source = new native.RTPIncomingSourceGroup(type);

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
				if (!this.transport.AddIncomingSourceGroup(source))
					//Launch exception
					throw new Error("Could not add incoming source group to native transport");
				//Append to sources with empty rid
				sources[''] = source;
			}
			
			//Create new track
			const incomingStreamTrack = new IncomingStreamTrack(native.TransportToReceiver(transport),track,sources);
			
			//Add listener
			incomingStreamTrack.on("stop",()=>{
				//REmove from map
				this.tracks.delete(track.getId());
				//For each source
				for (let id of Object.keys(sources))
					//Remove source group
					this.transport.RemoveIncomingSourceGroup(sources[id]);
			});
			//Add it to map
			this.tracks.set(track.getId(),incomingStreamTrack);
		}
		//Create event emitter
		this.emitter = new EventEmitter();
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
	 * @returns {IncomingStream} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Get all the tracks
	* @returns {Array<IncomingStreamTrack>}	- Array of tracks
	 */
	getTracks() 
	{
		//Return a track array
		return Array.from(this.tracks.values());
	}
	/**
	 * Get an array of the media stream audio tracks
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
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
	 * @returns {Array<IncomingStreamTrack>}	- Array of tracks
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
	
	/**
	 * Removes the media strem from the transport and also detaches from any attached incoming stream
	 */
	stop()
	{
		//Don't call it twice
		if (!this.transport) return;
		
		//Stop all streams
		for (let track of this.tracks.values())
			//Stop track
			track.stop();
		
		//Clear tracks jic
		this.tracks.clear();
		
		/**
		* IncomingStream stopped event
		*
		* @event IncomingStream#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}

module.exports = IncomingStream;