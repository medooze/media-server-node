const native = require("../build/Release/medooze-media-server");
const Endpoint = require("./Endpoint");
const Recorder = require("./Recorder");

let inited = false;

module.exports = 
{
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
	createRecorder: function(filename)
	{
		//Return recorder
		return new Recorder(filename);
	}
};

