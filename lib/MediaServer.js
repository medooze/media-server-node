 /** @namespace */
const MediaServer = {};

const Native			= require("./Native.js");
const Endpoint			= require("./Endpoint");
const Streamer			= require("./Streamer");
const Recorder			= require("./Recorder");
const Player			= require("./Player");
const ActiveSpeakerDetector	= require("./ActiveSpeakerDetector");
const Refresher			= require("./Refresher");

//INitialize DTLS
Native.MediaServer.Initialize();


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
 */
MediaServer.createRefresher = function(params)
{
       //Return streamer
       return new Refresher(params);
};


module.exports = MediaServer;
