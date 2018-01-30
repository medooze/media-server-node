const os = require('os');
 
try 
{
	//We try first to load it via dlopen on Node 9
	process.dlopen(module, "../build/Release/medooze-media-server.node", os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_DEEPBIND);
} catch (e) {
	//old one
	module.exports = require("../build/Release/medooze-media-server");
}
