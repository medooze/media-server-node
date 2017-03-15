// Open the native interace
const native = require("../build/Release/medooze-media-server");
const RecorderTrack = require("./RecorderTrack");
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
		//init track list
		this.tracks = new Set();
		//The track max
		this.maxTrackId = 1;
	}
	
	/**
	 * Start recording and incoming
	 * @param {IncomingStream} incomingStream - Incomining stream
	 * @returns {Array<RecorderTrack>} 
	 */
	record(incomingStream) {
		
		const tracks = [];
		
		//Get all of our audio streams
		const incomingStreamTracks =  incomingStream.getTracks();
		
		//If we have any
		if (incomingStreamTracks.length)
		{
			//Try to match each ones
			for (let i=0;i<incomingStreamTracks.length;++i)
			{
				const incomingStreamTrack = incomingStreamTracks[i];
				//Start listening for frames
				incomingStreamTrack.depacketizer.AddMediaListener(this.recorder);
				//Create new track in recorder
				const recorderTrack = new RecorderTrack(this.maxTrackId++,incomingStreamTrack);
				//Listen for stop event
				recorderTrack.on("stopped", () =>{
					//Stop listening for frames
					incomingStreamTrack.depacketizer.RemoveMediaListener(this.recorder);
					//remove it
					this.tracks.delete(recorderTrack);
				});
				//Push to recorder tracks
				this.tracks.add(recorderTrack);
				//And to the array
				tracks.push(recorderTrack);
			}
		}
		
		//Return all the added tracks
		return tracks;
	}
	
	/**
	 * Stop recording and close file. NOTE: File will be flsuh async,
	 * @returns {undefined} -  TODO: return promise when flush is ended
	 */
	stop()
	{
		//Stop all streams it will detach them
		for (let track of this.tracks.values())
			//Stop track
			track.stop();
		
		//Clear tracks jic
		this.tracks.clear();
		
		//Close
		this.recorder.Close();
		//Free
		this.recorder = null;
	}
	
	
}

module.exports = Recorder;