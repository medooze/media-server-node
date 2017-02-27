const native = require("../build/Release/medooze-media-server");
const Endpoint = require("./Endpoint");
const Recorder = require("./Recorder");

let inited = false;

module.exports = 
{
	/**
	 * Create a new endpoint object
	 * @param {String} ip	- External IP address of server, to be used when announcing the local ICE candidate
	 * @returns {Endpoint} The new created endpoing
	 */
	createEndpoint: function(ip)
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
	},
	/**
	 * Create a new MP4 recorder
	 * @param {String} filename - Path and filename of the recorded mp4 file
	 * @returns {Recorder}
	 */
	createRecorder: function(filename)
	{
		//Return recorder
		return new Recorder(filename);
	}
};

