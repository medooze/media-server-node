 /** @namespace */
const MediaServer = {};

const native = require("../build/Release/medooze-media-server");
const Endpoint = require("./Endpoint");
const Streamer = require("./Streamer");
const Recorder = require("./Recorder");

//INitialize DTLS
native.MediaServer.Initialize();

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
 * Enable or disable ultra debug level traces
 * @memberof MediaServer
 * @param {Boolean} flag
 */
MediaServer.enableUltraDebug = function(flag)
{
	//Set flag
	native.MediaServer.EnableUltraDebug(flag);
};
const x = {
		 emit : function(x) {
			console.log(x); 
			//a(x);
		 }
	 };
	 
 MediaServer.RunCallback = function(a){
	 console.log("x2"); 
	native.MediaServer.RunCallback(x);
	console.log("x"); 
 };
 
 setInterval(() =>{
	 
 },1000)
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
