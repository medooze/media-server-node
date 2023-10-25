const Native		= require("./Native");
const Emitter		= require("medooze-event-emitter");
const LFSR		= require('lfsr');
const { v4: uuidV4 }	= require("uuid");

const SemanticSDP	= require("semantic-sdp");
const IncomingStream	= require("./IncomingStream");

const {
	SDPInfo,
	Setup,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
	SourceGroupInfo,
} = require("semantic-sdp");

const Utils		= require("./Utils");

/**
 * An emulated transport reads data from a unencrypted pcap file (typically from a transport dump), and acts like if it was a live transport from a remote peer.
 * You must create the incoming streams as signaled on the remote SDP as any incoming RTP with an unknown ssrc will be ignored. The emulated transport does not allow creating outgoing streams.
 */
class EmulatedTransport extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(pcap)
	{
		//Init emitter
		super();

		//Create native emulator
		this.transport = new Native.PCAPTransportEmulator();
		
		//Check if it is a path or a reader
		if (typeof pcap === "string")
			//Open file
			this.transport.Open(pcap);
		else
			//Set reader
			this.transport.SetReader(pcap);
		
		//List of streams
		this.incomingStreams = new Map();
		
		//Create new sequence generator
		this.lfsr = new LFSR();
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
	 * Create an incoming stream object from the media stream info objet
	 * @param {StreamInfo} info Contains the ids and ssrcs of the stream to be created
	 * @returns {IncomingStream} The newly created incoming stream object
	 */
	createIncomingStream(info)
	{
		//We have to add the incmoing source for this stream
		let incomingStream = new IncomingStream(this.transport,new Native.RTPReceiverFacade(this.transport),info);
		
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
			return this.transport.Seek(params.start);
		
		//Start playback
		return this.transport.Play();
	}
	
	/**
	 * Resume playback
	 */
	resume()
	{
		return this.transport.Play();
	}
	
	/**
	 * Pause playback
	 */
	pause()
	{
		return this.transport.Stop();
	}
	
	/**
	 * Start playback from given time
	 * @param {Number} time - in miliseconds
	 */
	seek(time)
	{
		this.transport.Seek(time);
		
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
		* @name stopped
		* @memberof EmulatedTransport
		* @kind event
		* @argument {EmulatedTransport} transport
		*/
		this.emit("stopped",this);

		//Stop emitter
		super.stop();
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}


module.exports = EmulatedTransport;
