const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;

/**
 * Audio or Video track of a remote media stream
 */
class IncomingStreamTrack
{
	constructor(receiver,track,sources)
	{
		//Store track info
		this.id		= track.getId();
		this.media	= track.getMedia();
		this.receiver	= receiver;
	
		//Create source map
		this.encodings = new Map();
		
		//For each source
		for (let id of Object.keys(sources))
			//Push new encoding
			this.encodings.set(id, {
				id		: id,
				source		: sources[id],
				depacketizer	: new native.StreamTrackDepacketizer(sources[id])
			});
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	* Get track id as signaled on the SDP
	*/
	getId()
	{
		return this.id;
	}
	
	/**
	* Get track media type
	* @returns {String} "audio"|"video" 
	*/
	getMedia()
	{
		return this.media;
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStreamTrack} 
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
	 * @returns {IncomingStreamTrack} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Removes the track from the incoming stream and also detaches any attached outgoing track or recorder
	 */
	stop()
	{
		//Don't call it twice
		if (!this.receiver) return;
		
		//for each encoding
		for (let encoding of this.encodings.values())
			//Stop the depacketizer
			encoding.depacketizer.Stop();
		
		/**
		* IncomingStreamTrack stopped event
		*
		* @event IncomingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//remove encpodings
		this.encodings.clear();
		
		//Remove transport reference, so destructor is called on GC
		this.receiver = null;
	}

}

module.exports = IncomingStreamTrack;