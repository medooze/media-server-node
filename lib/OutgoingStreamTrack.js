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
 * Audio or Video track of a media stream sent to a remote peer
 */
class OutgoingStreamTrack
{
	constructor(transport,track)
	{
		//Store track info
		this.id		= track.getId();
		this.media	= track.getMedia();
		this.transport	= transport;
		//Is it audio or video
		let type	 = track.getMedia()==="audio" ? 0 : 1;
		//Create incoming track
		this.source = new native.RTPOutgoingSourceGroup(type);

		//Set source data
		this.source.media.ssrc = track.getSSRCs ()[0];
		
		//Check groups
		const FID    = track.getSourceGroup("FID");
	        const FEC_FR = track.getSourceGroup("FEC-FR");
		
		//Set rtx ssrc
		this.source.rtx.ssrc = FID ? FID.getSSRCs()[1] : 0;
		
		//Set rtx ssrc
		this.source.fec.ssrc = FEC_FR ? FEC_FR.getSSRCs()[1] : 0;
			
		//Add it to transport
		if (!this.transport.AddOutgoingSourceGroup(this.source))
			//Launch exception
			throw new Error("Could not add incoming source group to native transport");
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
	 */
	attachTo(incomingStreamTrack)
	{
		//Detach first just in case 
		this.detach();
		
		//Listen to 
		incomingStreamTrack.on("stopped",this.onAttachedTrackStopped);
		
		//Create transceiver
		this.transceiver = new native.StreamTransceiver(incomingStreamTrack.source,incomingStreamTrack.transport,this.source,this.transport);
		
		//Attached
		this.attached = incomingStreamTrack;
	}
	
	/**
	 * Stop listening for media 
	 */
	detach()
	{
		//If not attached
		if (!this.attached)
			//Do nothing
			return;
		
		//Remove listener
		this.attached.off("stopped",this.onAttachedTrackStopped);
		
		//Dettach
		this.transceiver = null;
		this.attached = null;
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
		return this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Removes the track from the outgoing stream and also detaches from any attached incoming track
	 */
	stop()
	{
		//Detach
		this.detach();
		
		//Remove from transport
		this.transport.RemoveOutgoingSourceGroup(this.source);
		
		//remove source
		this.source = null;
		
		/**
		* OutgoingStreamTrack stopped event
		*
		* @event OutgoingStreamTrack#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
	
}

module.exports = OutgoingStreamTrack;