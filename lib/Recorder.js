// Open the native interace
var native = require("../build/Release/medooze-media-server");

/**
 * MP4 recorder that allows to record several streams/tracks on a single mp4 file
 */
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
	
	/**
	 * Stop recording and close file. NOTE: File will be flsuh async,
	 * @returns {undefined} -  TODO: return promise when flush is ended
	 */
	stop()
	{
		//Close
		this.recorder.Close();
		//Free
		this.recorder = null;
	}
	
	
}

module.exports = Recorder;