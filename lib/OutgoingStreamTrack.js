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

const Transponder	= require("./Transponder");

/**
 * Audio or Video track of a media stream sent to a remote peer
 */
class OutgoingStreamTrack
{
	constructor(sender,track,source)
	{
		//Store track info
		this.id		= track.getId();
		this.media	= track.getMedia();
		this.sender	= sender;
		this.source	= source;
		
		//Create event emitter
		this.emitter = new EventEmitter();
		
		//The listener for attached tracks end event
		this.onAttachedTrackStopped = () => {
			//Dettach
			this.detach();
		};
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
	 * Listen media from the incoming stream track and send it to the remote peer of the associated transport.
	 * @param {IncomingStreamTrack} incomingStreamTrack - The incoming stream to listen media for
	 * @returns {Transponder} Track transponder object
	 */
	attachTo(incomingStreamTrack)
	{
		//Detach first just in case 
		this.detach();
		
		//Listen to 
		incomingStreamTrack.on("stopped",this.onAttachedTrackStopped);
		
		//Create native transponder object
		const transponder  = new native.RTPStreamTransponderFacade(incomingStreamTrack.source,incomingStreamTrack.receiver,this.source,this.sender);
		
		//Store transponder wrapper
		this.transponder = new Transponder(transponder);
		
		//Listen the stop event
		this.transponder.on("stopped",()=>{
			//Remove listener
			this.attached.off("stopped",this.onAttachedTrackStopped);
			//Dettach
			this.transponder = null;
			this.attached = null;
		});
		
		//Attached
		this.attached = incomingStreamTrack;
		
		//Return transponder
		return this.transponder;
	}
	
	/**
	 * Stop listening for media 
	 */
	detach()
	{
		//If not attached
		if (!this.transponder)
			//Do nothing
			return;
		//Stop transponder
		this.transponder.stop();
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
	 * Removes the track from the outgoing stream and also detaches from any attached incoming track
	 */
	stop()
	{
		//Don't call it twice
		if (!this.sender) return;
		
		//Detach
		this.detach();
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @event OutgoingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.source = null;
		this.sender = null;
	}
	
}

module.exports = OutgoingStreamTrack;