 /** @namespace */
const MediaServer = {};

const Native					= require("./Native.js");
const Endpoint					= require("./Endpoint");
const Streamer					= require("./Streamer");
const Recorder					= require("./Recorder");
const Player					= require("./Player");
const ActiveSpeakerDetector			= require("./ActiveSpeakerDetector");
const Refresher					= require("./Refresher");
const EmulatedTransport				= require("./EmulatedTransport");
const IncomingStreamTrackSimulcastAdapter	= require("./IncomingStreamTrackSimulcastAdapter");
const IncomingStreamTrackReader			= require("./IncomingStreamTrackReader");

const SemanticSDP	= require("semantic-sdp");
const {
	SDPInfo,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
	Setup,
} = require("semantic-sdp");

//@ts-expect-error
const parseInt = /** @type {(x: number) => number} */ (global.parseInt);

//Sequence for init the other LFSR instances
const LFSR	  = require('lfsr');
const IncomingStream = require("./IncomingStream.js");
const defaultSeed = new LFSR(8, 92914);

const endpoints	  = new Set();

//Replace default seeed
LFSR.prototype._defaultSeed = function(n) {
	if (!n) throw new Error('n is required');
	return defaultSeed.seq(n);
};

/**
 * Set new DTLS certificates. Should be called before any Endpoint is established.
 * @memberof MediaServer
 * @param {String} cert - path of the certificate file
 * @param {String} key - path of the key file
 */
MediaServer.setCertificate = function(cert,key)
{
	//Ensure we have cert and key and set it
	if (!cert || !key || !Native.MediaServer.SetCertificate(cert,key))
		throw new Error('Could not set DTLS key and certificates');
};


/**
* Get local DTLS fingerprint for this Media Server.
* @returns {String}
*/
MediaServer.getDTLSFingerprint = function()
{
	return Native.MediaServer.GetFingerprint().toString();
}

/**
 * Close async handlers so nodejs can exit nicely
 * Only call it once!
 * @memberof MediaServer
  */
MediaServer.terminate = function()
{
	//Stop all endpoints
	for (const endpoint of endpoints)
		endpoint.stop();
	
	//Set flag
	Native.MediaServer.Terminate();
};


/**
 * Enable or disable log level traces
 * @memberof MediaServer
 * @param {Boolean} flag
 */
MediaServer.enableLog = function(flag)
{
	//Set flag
	Native.MediaServer.EnableLog(flag);
};


/**
 * Enable or disable debug level traces
 * @memberof MediaServer
 * @param {Boolean} flag
 */
MediaServer.enableDebug = function(flag)
{
	//Set flag
	Native.MediaServer.EnableDebug(flag);
};

/**
 * Set UDP port range for encpoints
 * @memberof MediaServer
 * @param {Number} minPort - Min UDP port
 * @param {Number} maxPort - Max UDP port [Optional]
 */
MediaServer.setPortRange = function(minPort,maxPort)
{
	//Set flag
	return Native.MediaServer.SetPortRange(parseInt(minPort),parseInt(maxPort));
};

/**
 * Set node uv loop cpu affinity
 * @memberof MediaServer
 * @param {Number} cpu - CPU core number
 * @returns {boolean} true if operation was successful
 */
MediaServer.setAffinity = function(cpu)
{
	//Set flag
	return Native.MediaServer.SetAffinity(parseInt(cpu));
};

/**
 * Set node uv loop thread name.
 *
 * Useful for debugging or tracing. Currently only supported
 * on Linux, fails on other platforms.
 * Length is limited to 16 bytes.
 * @param {String}  name - thread name to set
 * @returns {boolean} true if operation was successful
 */
MediaServer.setThreadName = function(name)
{
	//Set flag
	return Native.MediaServer.SetThreadName(name);
};

/**
 * Enable or disable ultra debug level traces
 * @memberof MediaServer
 * @param {Boolean} flag
 */
MediaServer.enableUltraDebug = function(flag)
{
	//Set flag
	Native.MediaServer.EnableUltraDebug(flag);
};

/**
 * @typedef {Object} EndpointParams Endpoint creation parameters
 * @property {number} packetPoolSize Packet pool size
 */

/**
 * Create a new endpoint object
 * @memberof MediaServer
 * @param {string | string[]} ip				- External IP address of server, to be used when announcing the local ICE candidate
 * @param {EndpointParams} [params]
 * @returns {Endpoint} The new created endpoing
 */
MediaServer.createEndpoint = function(ip, params)
{
	//Cretate new rtp endpoint
	const endpoint = new Endpoint(ip, Number.isInteger(params?.packetPoolSize) ? params.packetPoolSize : 0);
	
	//Add to endpoint set
	endpoints.add(endpoint);
	
	//Listen for stopped evetns
	endpoint.once("stopped",()=>{
		//Remove when stopped
		endpoints.delete(endpoint);
	});
	
	//Done
	return endpoint;
};
/**
* Helper that creates an offer from capabilities
* It generates a random ICE username and password and gets media server dtls fingerprint
* @param {SemanticSDP.Capabilities} [capabilities] - Media capabilities as required by SDPInfo.create
* @returns {SDPInfo} - SDP offer
*/
MediaServer.createOffer = function(capabilities)
{
	//Create offer
	return SDPInfo.create({
		dtls		: new DTLSInfo(Setup.ACTPASS,"sha-256", MediaServer.getDTLSFingerprint()),
		ice		: ICEInfo.generate(true),
		candidates	: [],
		capabilities	: capabilities
	});
}

/**
* Create a new MP4 recorder
* @memberof MediaServer
* @param {String} filename - Path and filename of the recorded mp4 file
* @param {Recorder.RecorderParams} [params]
* @returns {Recorder}
*/
MediaServer.createRecorder = function(filename,params)
{
       //Return recorder
       return new Recorder(filename,params);
};

/**
* Create a new MP4 player
* @memberof MediaServer
* @param {String} filename - Path and filename of the mp4 file
* @returns {Player}
*/
MediaServer.createPlayer = function(filename)
{
       //Return player
       return new Player(filename);
};

/**
* Create a new RTP streamer
* @memberof MediaServer
* @returns {Streamer}
*/
MediaServer.createStreamer = function()
{
       //Return streamer
       return new Streamer();
};

/**
 * Create a new Active Speaker Detecrtor
 */
MediaServer.createActiveSpeakerDetector = function()
{
       //Return streamer
       return new ActiveSpeakerDetector();
};


/**
 * Create a new stream refresher
 * @param {number} period - Intra refresh period
*/
MediaServer.createRefresher = function(period)
{
       //Return streamer
       return new Refresher(period);
};

/**
 * Create a new incoming track reader
 * @param {boolean} intraOnly - Intra frames only
 * @param {number} minPeriod - Minimum period between frames
*/
MediaServer.createIncomingStreamTrackReader = function(intraOnly, minPeriod)
{
       //Return streamer
       return new IncomingStreamTrackReader(intraOnly, minPeriod);
};



/**
 * Create a new emulated transport from pcap file
 * @param {String} pcap - PCAP filename and path
*/
MediaServer.createEmulatedTransport = function(pcap)
{
	//Return emulated transport
	const endpoint =  new EmulatedTransport(pcap);
	
       	//Add to endpoint set
	endpoints.add(endpoint);
	
	//Listen for stopped evetns
	endpoint.once("stopped",()=>{
		//Remove when stopped
		endpoints.delete(endpoint);
	});
	
	//Done
	return endpoint;
};

MediaServer.createIncomingStreamTrackSimulcastAdapter = function(
	/** @type {string} */ trackId,
	/** @type {string} */ mediaId,
	/** @type {Native.TimeService | null} */ timeService = null)
{
	/**
	 * @type {Native.EventLoop | null}
	 */
	let loop = null;
	if (!timeService)
	{
		//Create one event loop for this
		loop = new Native.EventLoop();
		//Start it
		loop.Start();
		
		timeService = loop;
	}
	
	//Create it
	const incomingStreamTrack = new IncomingStreamTrackSimulcastAdapter(trackId, mediaId, timeService);
	//Stop loop on track close if it is created here
	if (loop)
	{
		incomingStreamTrack.once("stopped",()=>loop?.Stop());
	}
	//Done
	return incomingStreamTrack;
}

MediaServer.createIncomingStreamSimulcastAdapter = function(
	/** @type {string} */ streamId,
	/** @type {string} */ trackId,
	/** @type {string} */ mediaId)
{
	//Create transport-less stream
	const incomingStream = new IncomingStream(null,null,{id: streamId,tracks:[]});
	//Create track
	const incomingStreamTrack =  MediaServer.createIncomingStreamTrackSimulcastAdapter(trackId, mediaId);
	//Add track to stream
	incomingStream.addTrack(incomingStreamTrack);
	//Done
	return incomingStream;
}

/**
 * Get the default media server capabilities for each supported media type
 * @returns {SemanticSDP.Capabilities} Object containing the capabilities by media ("audio","video")
 */
MediaServer.getDefaultCapabilities = function()
{
	return {
		audio : {
			codecs		: ["opus","pcmu","pcma"],
			extensions	: [
				"urn:ietf:params:rtp-hdrext:ssrc-audio-level",
				"urn:ietf:params:rtp-hdrext:sdes:mid",
				"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
				"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
			]
		},
		video : {
			codecs		: ["vp8","vp9","h264;packetization-mode=1","av1", "h265"],
			rtx		: true,
			simulcast	: true,
			rtcpfbs		: [
				{ "id": "goog-remb"},
				{ "id": "transport-cc"},
				{ "id": "ccm", "params": ["fir"]},
				{ "id": "nack"},
				{ "id": "nack", "params": ["pli"]}
			],
			extensions	: [
				"urn:3gpp:video-orientation",
				"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
				"urn:ietf:params:rtp-hdrext:sdes:mid",
				"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
				"urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id",
				"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
			]
		}
	};
};
module.exports = MediaServer;
