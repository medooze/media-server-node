const EventEmitter	= require('events').EventEmitter;

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
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	attachTo(incomingStream)
	{
		
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
};

module.exports = OutgoingStream;