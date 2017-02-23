const native = require("../build/Release/medooze-media-server");
const RTPEndpoint = require("./Endpoint");

let inited = false;

module.exports = 
{
	createRTPEndpoint: function(ip)
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
		return new RTPEndpoint(ip);
	}
};

