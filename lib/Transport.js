const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const LFSR		= require('lfsr');
const uuidV4		= require('uuid/v4');

const SemanticSDP	= require("semantic-sdp");
const IncomingStream	= require("./IncomingStream");
const OutgoingStream	= require("./OutgoingStream");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;

function ConvertRTPProperties(rtp)
{
	//Create new native properties object
	let properties = new native.PropertiesFacade();

	//If we have got audio
	if (rtp.audio)
	{
		let num = 0;
		//For each codec
		for (let codec of rtp.audio.getCodecs().values())
		{
			//Item
			let item = "audio.codecs."+num;
			//Put codec
			properties.SetProperty(item+".codec",codec.getCodec());
			properties.SetProperty(item+".type",codec.getType());
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetProperty(item+".rtx",codec.getRTX());
			//one more
			num++;
		}
	}

	//If we have got video
	if (rtp.video)
	{
		let num = 0;
		//For each codec
		for (let codec of rtp.video.getCodecs().values())
		{
			//Item
			let item = "video.codecs."+num;
			//Put codec
			properties.SetProperty(item+".codec",codec.getCodec());
			properties.SetProperty(item+".type",codec.getType());
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetProperty(item+".rtx",codec.getRTX());
			//one more
			num++;
		}
	}
	//Return
	return properties;
};

/**
 * DTLICETransport
 *	This class implements both DTLS and ICE tranposrt of the media sever
 *	Being a media server, it uses ice-lite so not ICE gathering is requiered the local candidate will be only a HOST one
 */
class Transport
{
	constructor(bundle,remote)
	{
		//Ensure we have ice and dtls on remote
		if (!remote || !remote.ice || !remote.dtls)
			//Throw errror
			throw new Error("You must provide remote ice and dtls info");
		
		//Store remote properties
		this.remote = remote;
		
		//Create local info
		this.local = {
			ice  : ICEInfo.generate()
		};
		
		//Create new native properties object
		let properties = new native.PropertiesFacade();

		//Put ice properties
		properties.SetProperty("ice.localUsername"	, this.local.ice.getUfrag());
		properties.SetProperty("ice.localPassword"	, this.local.ice.getPwd());
		properties.SetProperty("ice.remoteUsername"	, this.remote.ice.getUfrag());
		properties.SetProperty("ice.remotePassword"	, this.remote.ice.getPwd());
		
		//Put remote dtls properties
		properties.SetProperty("dtls.setup"		, Setup.toString(remote.dtls.getSetup()));
		properties.SetProperty("dtls.hash"		, remote.dtls.getHash());
		properties.SetProperty("dtls.fingerprint"	, remote.dtls.getFingerprint());
		
		//Create username
		var username = new native.StringFacade(this.remote.ice.ufrag + ":" + this.local.ice.ufrag);
		
		//Create native
		this.transport = bundle.AddICETransport(username,properties);
		
		//If no transport
		if (!this.transport)
			//error
			throw new Error("Could not create native transport");
		//Get fingerprint
		let fingerprint = native.MediaServer.GetFingerprint().toString ();
		
		//Set DLTS properties
		//TODO: Setup.reverse(local.dtls.getSetup);
		this.local.dtls = new DTLSInfo(Setup.PASSIVE,"sha-256",fingerprint);
		
		//List of streams
		this.incomingStreams = new Map();
		this.outgoingStreams = new Map();
		
		//Create new sequence generator
		this.lfsr = new LFSR();
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	setLocalProperties(rtp)
	{
		//Get native properties
		let properties = ConvertRTPProperties(rtp);
		//Set it
		this.transport.SetLocalProperties(properties);
	}
	
	setRemoteProperties(rtp)
	{
		//Get native properties
		let properties = ConvertRTPProperties(rtp);
		//Set it
		this.transport.SetRemoteProperties(properties);
	}
	
	on() 
	{
		//Delegate event listeners to event emitter
		return this.emitter.on.apply(this.emitter, arguments);  
	}
	
	off() 
	{
		//Delegate event listeners to event emitter
		return this.emitter.removeListener.apply(this.emitter, arguments);  
	}
	
	getLocalDTLSInfo()
	{
		return this.local.dtls;
	}
	
	getLocalICEInfo()
	{
		return this.local.ice;
	}
	
	
	createOutgoingStream(params) 
	{
		//The list of streams
		let info = new StreamInfo(uuidV4());
		
		//If we have audio
		if (params.audio)
		{
			//Crete new track
			let track = new TrackInfo("audio","audio");
			//Generte new ssrc
			let ssrc =  this.lfsr.seq(31);

			//Add to track
			track.addSSRC(ssrc);
			//Add track to stream
			info.addTrack(track);
		}
		//If we have video
		if (params.video)
		{
			//Crete new track
			let track = new TrackInfo("video","video");
			//Generte new ssrc
			let ssrc =  this.lfsr.seq(31);
			let rtx  =  this.lfsr.seq(31);
			let fec  =  this.lfsr.seq(31);
			//Add to track
			track.addSSRC(ssrc);
			track.addSSRC(rtx);
			track.addSSRC(fec);
			//Add groups
			track.addSourceGroup (new SourceGroupInfo("FID",[ssrc,rtx]));
			track.addSourceGroup (new SourceGroupInfo("FEC-FR",[ssrc,fec]));
			//Add track to stream
			info.addTrack(track);
		}
		//Create it
		let outgoingStream = new OutgoingStream(this.transport,info);
		
		//Add listener
		outgoingStream.on("stopped",() => {
			//Remove it
			this.outgoingStreams.delete(outgoingStream.getId());
		});
		
		//Add to list
		this.outgoingStreams.set(outgoingStream.getId(),outgoingStream);
			
		//Return it
		return outgoingStream;
	}
	
	/**
	 * Create an incoming stream object from the media stream info objet
	 * @param {StreamInfo} info Contains the ids and ssrcs of the stream to be created
	 * @returns {IncomingStream} The newly created incoming stream object
	 */
	createIncomingStream(info)
	{
		//We have to add the incmoing source for this stream
		let incomingStream = new IncomingStream(this.transport,info);
		
		//Add to list
		this.incomingStreams.set(incomingStream.getId(),incomingStream);
		
		//Add listener
		incomingStream.on("stopped",() => {
			//Remove it
			this.incomingStreams.delete(incomingStream.getId());
		});
			
		//Return it
		return incomingStream;
	}
	
	/**
	 * Create new outgoing stream and attach to the incoming stream
	 * @param {IncomingStream} incomingStream the incoming stream to be published in this transport
	 * @returns {OutgoingStream} The new outgoing stream
	 */
	publish(incomingStream) 
	{
		//Create new incoming stream
		let outgoingStream = this.createOutgoingStream ({
			audio: incomingStream.getAudioTracks().length,
			video: incomingStream.getVideoTracks().length
		});
		
		//Attach the streams
		outgoingStream.attachTo(incomingStream);
		
		//return the new created stream
		return outgoingStream;
	}
	
	/**
	 * Stop transport and all the associated incoming and outgoing streams
	 */
	stop()
	{
		//Stop all streams
		for (let stream of this.incomingStreams.values())
			//stop
			stream.stop();
		//Stop all streams
		for (let stream of this.outgoingStreams.values())
			//stop
			stream.stop();
		//Clear maps jic
		this.incomingStreams.clear();
		this.outgoingStreams.clear();
		
		/**
		* Transport stopped event
		*
		* @event Transport#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
}


module.exports = Transport;
