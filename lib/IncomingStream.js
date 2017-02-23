const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;

class IncomingStream
{
	constructor(transport,info)
	{
		//Store id
		this.id = info.id;
		
		//Store native transport
		this.transport = transport;
		
		//Store sources
		this.tracks = new Map();
		
		//For each tracks
		for (let track of info.getTracks().values())
		{
			//Create new track
			let incomingStreamTrack = new IncomingStreamTrack(transport,track);
			//Add listener
			incomingStreamTrack.on("stop",()=>{
				//REmove from map
				this.tracks.delete(track.getId());
			});
			//Add it to map
			this.tracks.set(track.getId(),track);
		}
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	getId() 
	{
		return id;
	}

	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter.on.apply(this.emitter, arguments);  
	}
	
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.off.apply(this.emitter, arguments);  
	}
	
	stop()
	{
		//Stop all streams
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
	
	
}

module.exports = IncomingStream;