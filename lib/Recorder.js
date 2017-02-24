// Open the native interace
var native = require("../build/Release/medooze-media-server");

class Recorder
{
	constructor(filename)
	{
		//Check mp4 file name
		if (!filename || !filename.length)
			//Error
			throw new Error("MP4 filename nos specified");
		
		//Create native recorder
		this.recorder = new native.MP4Recorder();
		//Create file
		this.recorder.Create(filename);
		//Start recording it
		this.recorder.Record();
	}
	
	stop()
	{
		//Close
		this.recorder.Close();
		//Free
		this.recorder = null;
	}
	
	
}

module.exports = Recorder;