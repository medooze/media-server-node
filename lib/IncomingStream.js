const Native		= require("./Native");
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
	constructor(transport,receiver,info)
	{
		//Store stream info
		this.info = info.constructor.name === "StreamInfo" ? info.clone() : StreamInfo.expand(info);
		
		//Store id
		this.id = this.info.getId();
		
		//Store native transport
		this.transport = transport;
		
		//Store sources
		this.tracks = new Map();
		
		//For each tracks
		for (let track of this.info.getTracks().values())
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
						const source = new Native.RTPIncomingSourceGroup(type);
						
						//Get rid
						const rid = encodings[i][j].getId();
						
						//Set rtp stream id
						source.rid = new Native.StringFacade(rid);
						
						//Get RID params
						const params = encodings[i][j].getParams();
						
						//If it has ssrc
						if (params && params.has("ssrc"))
						{
							//Get it
							source.media.ssrc = parseInt(params.get("ssrc"));
							
							//Check ssrc groups
							const groups  = track.getSourceGroups();
							
							//Check groups
							for (let k=0; k<groups.length; ++k)
							{
								console.log(groups[k]);
								//Check if it is from us
								if (groups[k].getSSRCs && groups[k].getSSRCs()[0]===source.media.ssrc)
								{
									//Check if it is one of the ones we care
									switch(groups[k].getSemantics())
									{
										case "FID":
											//Set rtx ssrc
											source.rtx.ssrc = groups[k].getSSRCs()[1];
											break;
										case "FEC-FR":
											//Set flex fec ssrc
											source.fec.ssrc = groups[k].getSSRCs()[1];
											break;
									}
								}
							}
						}
						//Add it to transport
						if (!this.transport.AddIncomingSourceGroup(source))
							//Launch exception
							throw new Error("Could not add incoming source group to native transport");
						//Append to sources
						sources[rid] = source;
					}
				}
			//Check if it is a chrome-like sumulcast
			} else if (track.hasSourceGroup("SIM")) {
				//Get MID group
				const SIM = track.getSourceGroup("SIM");
				//Get ssrcs
				const ssrcs = SIM.getSSRCs();
				
				//Check the other groups
				const groups  = track.getSourceGroups();
				
				//For each ssrc in MID
				for (let i=0; i<ssrcs.length; ++i)
				{
					//Create single incoming source
					const source = new Native.RTPIncomingSourceGroup(type);

					//Set source data
					source.media.ssrc = ssrcs[i];

					//Check groups
					for (let j=0; j<groups.length; ++j)
					{
						//Check if it is from us
						if (groups[j].getSSRCs()[0]===ssrcs[i])
						{
							//Check if it is one of the ones we care
							switch(groups[j].getSemantics())
							{
								case "FID":
									//Set rtx ssrc
									source.rtx.ssrc = groups[j].getSSRCs()[1];
									break;
								case "FEC-FR":
									//Set flex fec ssrc
									source.fec.ssrc = groups[j].getSSRCs()[1];
									break;
							}
						}
					}

					//Add it to transport
					if (!this.transport.AddIncomingSourceGroup(source))
						//Launch exception
						throw new Error("Could not add incoming source group to native transport");
					//Append to sources with MID index value
					sources[i] = source;
				}
			} else {
				//Create single incoming source
				const source = new Native.RTPIncomingSourceGroup(type);

				//Set source data
				source.media.ssrc = track.getSSRCs ()[0];

				//Check groups
				const FID    = track.getSourceGroup("FID");
				const FEC_FR = track.getSourceGroup("FEC-FR");

				//Set rtx ssrc
				source.rtx.ssrc = FID ? FID.getSSRCs()[1] : 0;

				//Set flec fex ssrc
				source.fec.ssrc = FEC_FR ? FEC_FR.getSSRCs()[1] : 0;

				//Add it to transport
				if (!this.transport.AddIncomingSourceGroup(source))
					//Launch exception
					throw new Error("Could not add incoming source group to native transport");
				//Append to sources with empty rid
				sources[''] = source;
			}
			
			//Create new track
			const incomingStreamTrack = new IncomingStreamTrack(track.getMedia(),track.getId(),receiver,sources);
			
			//Add listener
			incomingStreamTrack.once("stopped",()=>{
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
	 * Get the stream info object for signaling the ssrcs and stream info on the SDP from the remote peer
	 * @returns {StreamInfo} The stream info object
	 */
	getStreamInfo()
	{
		return this.info;
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
	 * Add event listener once
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStream} 
	 */
	once() 
	{
		//Delegate event listeners to event emitter
		this.emitter.once.apply(this.emitter, arguments);
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
	 * Get statistics for all tracks in the stream
	 * 
	 * See OutgoingStreamTrack.getStats for information about the stats returned by each track.
	 * 
	 * @returns {Map<String>,Object} Map with stats by trackId
	 */
	getStats() 
	{
		const stats = {};
		
		//for each track
		for (let track of this.tracks.values())
			//Append stats
			stats[track.getId()] = track.getStats();
		
		return stats;
	}
	
	/**
	 * Get track by id
	 * @param {String} trackId	- The track id
	 * @returns {IncomingStreamTrack}	- requested track or null
	 */
	getTrack(trackId) 
	{
		//get it
		return this.tracks.get(trackId);
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
		this.emitter.emit("stopped",this);
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}

module.exports = IncomingStream;