 /** @namespace */
const MediaServer = {};

const Native			= require("./Native.js");
const Endpoint			= require("./Endpoint");
const Streamer			= require("./Streamer");
const Recorder			= require("./Recorder");
const Player			= require("./Player");
const ActiveSpeakerDetector	= require("./ActiveSpeakerDetector");
const Refresher			= require("./Refresher");
const EmulatedTransport		= require("./EmulatedTransport");

//INitialize DTLS
Native.MediaServer.Initialize();

//Sequence for init the other LFSR instances
const LFSR	  = require('lfsr');
const defaultSeed = new LFSR(8, 92914);

//Replace default seeed
LFSR.prototype._defaultSeed = function(n) {
	if (!n) throw new Error('n is required');
	return defaultSeed.seq(n);
};

/**
 * Close async handlers so nodejs can exit nicely
 * Only call it once!
 * @memberof MediaServer
  */
MediaServer.terminate = function()
{
	//Set flag
	Native.MediaServer.Terminate();
};


/**
 * Enable or disable log level traces
 * @memberof MediaServer
 * @param {Boolean} flag
 */
MediaServer.enableLog= function(flag)
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
 * @param {Integer} minPort - Min UDP port
 * @param {Integer} maxPort - Max UDP port
 * @returns {Endpoint} The new created endpoing
 */
MediaServer.setPortRange = function(minPort,maxPort)
{
	//Set flag
	return Native.MediaServer.SetPortRange(minPort,maxPort);
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
 * Create a new endpoint object
 * @memberof MediaServer
 * @param {String} ip	- External IP address of server, to be used when announcing the local ICE candidate
 * @returns {Endpoint} The new created endpoing
 */
MediaServer.createEndpoint = function(ip)
{
	//Cretate new rtp endpoint
	return new Endpoint(ip);
};

/**
* Create a new MP4 recorder
* @memberof MediaServer
* @param {String} filename - Path and filename of the recorded mp4 file
* @param {Object} params - Recording parameters (Optional)
* @param {Object} params.refresh - Periodically refresh an intra on all video tracks (in ms)
* @param {Object} params.waitForIntra - Wait until first video iframe is received to start recording media
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
 * @param {type} period - Intra refresh period
*/
MediaServer.createRefresher = function(period)
{
       //Return streamer
       return new Refresher(period);
};


/**
 * Create a new emulated transport from pcap file
 * @param {String} filename - PCAP filename and path
*/
MediaServer.createEmulatedTransport = function(pcap)
{
       //Return emulated transport
       return new EmulatedTransport(pcap);
};

/**
 * Get the default media server capabilities for each supported media type
 * @returns {Object} Object containing the capabilities by media ("audio","video")
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
			codecs		: ["vp8","vp9","h264;packetization-mode=1","av1"],
			rtx		: true,
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
