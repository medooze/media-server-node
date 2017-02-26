const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const OutgoingStreamTrack	= require("./OutgoingStreamTrack");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;

class OutgoingStream
{
	constructor(transport,info)
	{
		//Store id
		this.id = info.id;
		this.info = info;
		
		//Store native transport
		this.transport = transport;
		
		//Store sources
		this.tracks = new Map();
		
		//For each tracks
		for (let track of info.getTracks().values())
		{
			//Create new track
			let outgoingStreamTrack = new OutgoingStreamTrack(transport,track);
			//Add listener
			outgoingStreamTrack.on("stop",()=>{
				//REmove from map
				this.tracks.delete(track.getId());
			});
			//Add it to map
			this.tracks.set(track.getId(),outgoingStreamTrack);
		}
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	attachTo(incomingStream)
	{
		//Dettach
		this.detach();
		
		//Get all of our audio streams
		const audio = this.getAudioTracks();
		
		//If we have any
		if (audio.length)
		{
			//Get incoming audiotracks
			const tracks = incomingStream.getAudioTracks();
			//Try to match each ones
			for (let i=0;i<audio.length && i<tracks.length;++i)
				//Attach them
				audio[i].attachTo(tracks[i]);
		}
		//
		//Get all of our audio streams
		const video = this.getVideoTracks();
		
		//If we have any
		if (video.length)
		{
			//Get incoming audiotracks
			const tracks = incomingStream.getVideoTracks();
			//Try to match each ones
			for (let i=0;i<video.length && i<tracks.length;++i)
				//Attach them
				video[i].attachTo(tracks[i]);
		}
	}
	
	detach()
	{
		//For each track
		for (let track of this.tracks.values())
			//Detach it
			track.detach();
	}
	
	getStreamInfo()
	{
		return this.info;
	}
	
	getId() 
	{
		return this.id;
	}

	on() 
	{
		//Delegate event listeners to event emitter
		return this.emitter.on.apply(this.emitter, arguments);  
	}
	
	off() 
	{
		//Delegate event listeners to event emitter
		return this.emitter.removeListener.apply(this.emitter, arguments);  
	}
	
	stop()
	{
		//Stop all streams it will detach them
		for (let track of this.tracks.values())
			//Stop track
			track.stop();
		
		//Clear tracks jic
		this.tracks.clear();
		
		//Emit event
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
	
	getAudioTracks() 
	{
		var audio = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="audio")
				//Append to tracks
				audio.push(track);
		//Return all tracks
		return audio;
	}
	
	getVideoTracks() 
	{
		var video = [];
		
		//For each track
		for (let track of this.tracks.values())
			//If it is an video track
			if(track.getMedia().toLowerCase()==="video")
				//Append to tracks
				video.push(track);
		//Return all tracks
		return video;
	}
};

module.exports = OutgoingStream;