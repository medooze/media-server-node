 /** @namespace */
const MediaServer = {};

const native = require("../build/Release/medooze-media-server");
const Endpoint = require("./Endpoint");
const Streamer = require("./Streamer");
const Recorder = require("./Recorder");

let inited = false;

/**
 * Enable or disable debug level traces
 * @memberof MediaServer
 * @param {Boolean} flag
 */
MediaServer.enableDebug = function(flag)
{
	//Set flag
	native.MediaServer.EnableDebug(flag);
};
 
/**
 * Create a new endpoint object
 * @memberof MediaServer
 * @param {String} ip	- External IP address of server, to be used when announcing the local ICE candidate
 * @returns {Endpoint} The new created endpoing
 */
MediaServer.createEndpoint = function(ip)
{
	//If not inited
	if (!inited)
	{
		//INitialize DTLS
		native.MediaServer.Initialize();
		//We are inited
		inited = true;
	}
	//Cretate new rtp endpoint
	return new Endpoint(ip);
};

/**
* Create a new MP4 recorder
* @memberof MediaServer
* @param {String} filename - Path and filename of the recorded mp4 file
* @returns {Recorder}
*/
MediaServer.createRecorder= function(filename)
{
       //Return recorder
       return new Recorder(filename);
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


module.exports = MediaServer;
