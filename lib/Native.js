const os = require("os");
const path = require("path");
const SharedPointer = require("./SharedPointer");
 
try 
{
	//We try first to load it via dlopen on Node 9
	process.dlopen(module,path.resolve(path.dirname(module.filename), "../build/Release/medooze-media-server.node"), os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_DEEPBIND);
} catch (e) {
	//old one
	module.exports = require("../build/Release/medooze-media-server");
}

SharedPointer.wrapNativeModule(module);
