const native = require("../build/Release/medooze-media-server");
const EventEmitter	= require('events').EventEmitter;
const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;


class IncomingStreamTrack
{
	constructor(transport,track)
	{
		//Store track info
		this.id		= track.getId();
		this.media	= track.getMedia();
		this.transport	= transport;
		//Is it audio or video
		let type	 = track.getMedia()==="audio" ? 0 : 1;
		//Create incoming track
		this.source = new native.RTPIncomingSourceGroup(type);
		//Add it to transport
		if (!this.transport.AddIncomingSourceGroup(this.source))
			//Launch exception
			throw new Error("Could not add incoming source group to native transport");
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	getId()
	{
		return this.id;
	}
	
	getMedia()
	{
		return this.media;
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
		//Remove from transport
		this.transport.RemoveIncomingSourceGroup(this.source);
		
		//remove source
		this.source = null;
		
		//Emit event
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transport = null;
	}
	
}

module.exports = IncomingStreamTrack;