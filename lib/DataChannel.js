
const Emitter		= require("medooze-event-emitter");


class DataChannel extends Emitter
{
	constructor(endpointIdentifier, dataChannel)
	{
		super();
		
		this.endpointIdentifier = endpointIdentifier;
		this.dataChannel = dataChannel;
	}
	
	getId()
	{
		return this.dataChannel.GetId();
	}
	
	getLabel()
	{
		return this.dataChannel.GetLabel();
	}
	
	attachTo(dc)
	{
		
	}
	
	detach()
	{
		
	}
	
	mute()
	{
		
	}
	
	close()
	{
		this.emit("close");
		
		super.stop();
	}
}


module.exports = DataChannel;