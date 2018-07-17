const Native		= require("./Native");
const EventEmitter	= require('events').EventEmitter;
const LFSR		= require('lfsr');
const uuidV4		= require('uuid/v4');

const SemanticSDP	= require("semantic-sdp");
const IncomingStream	= require("./IncomingStream");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

const Utils		= require("./Utils");

/**
 * An emulated transport reads data from a unencrypted pcap file (typically from a transport dump), and acts like if it was a live transport from a remote peer.
 * You must create the incoming streams as signaled on the remote SDP as any incoming RTP with an unknown ssrc will be ignored. The emulated transport does not allow creating outgoing streams.
 */
class EmulatedTransport
{
	constructor(pcap)
	{
		//Create native emulator
		this.transport = new Native.PCAPTransportEmulator();
		
		//Open file and get first timestamp
		this.first = this.transport.Open(pcap);
		
		//List of streams
		this.incomingStreams = new Map();
		
		//Create new sequence generator
		this.lfsr = new LFSR();
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Set remote RTP properties 
	 * @param {Object|SDPInfo} rtp - Object param containing media information for audio and video
	 * @param {MediaInfo} rtp.audio	- Audio media info
	 * @param {MediaInfo} rtp.video	- Video media info
	 */
	setRemoteProperties(rtp)
	{
		//Get native properties
		let properties = Utils.convertRTPProperties(rtp.constructor.name ==="SDPInfo" ? {
				"audio" : rtp.getMedia("audio"),
				"video" : rtp.getMedia("video")
			} : rtp);
		//Set it
		this.transport.SetRemoteProperties(properties);
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listeener	- Event listener
	 * @returns {Transport} 
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
	 * @returns {Transport} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	
	/**
	 * Create an incoming stream object from the media stream info objet
	 * @param {StreamInfo} info Contains the ids and ssrcs of the stream to be created
	 * @returns {IncomingStream} The newly created incoming stream object
	 */
	createIncomingStream(info)
	{
		//We have to add the incmoing source for this stream
		let incomingStream = new IncomingStream(this.transport,Native.PCAPTransportEmulatorToReceiver(this.transport),info);
		
		//Add to list
		this.incomingStreams.set(incomingStream.getId(),incomingStream);
		
		//Add listener
		incomingStream.once("stopped",() => {
			//Remove it
			this.incomingStreams.delete(incomingStream.getId());
		});
			
		//Return it
		return incomingStream;
	}
	
	/**
	 * Starts playback
	 * @param {Object} params	
	 * @param {Object} params.start - Set start time
	 */
	play(params)
	{
		//If we need to seek
		if (params && params.start)
			//Seek
			this.transport.Seek(params.start);
		
		//Start playback
		return this.transport.Play();
	}
	
	/**
	 * Resume playback
	 */
	resume()
	{
		return this.player.Play();
	}
	
	/**
	 * Pause playback
	 */
	pause()
	{
		return this.player.Stop();
	}
	
	/**
	 * Start playback from given time
	 * @param {Number} time - in miliseconds
	 */
	seek(time)
	{
		this.player.Seek(time);
		
		return this.transport.Play();
	}
	
	/**
	 * Stop transport and all the associated incoming and outgoing streams
	 */
	stop()
	{
		//Don't call it twice
		if (!this.transport) return;
		
		//Stop all streams
		for (let stream of this.incomingStreams.values())
			//stop
			stream.stop();
		//Clear maps jic
		this.incomingStreams.clear();
		
		//Stop transort
		this.transport.Stop();
		
		/**
		* Transport stopped event
		*
		* @event Transport#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped",this);
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}


module.exports = EmulatedTransport;
