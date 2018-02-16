const Native			= require("./Native");
const EventEmitter		= require('events').EventEmitter;
const SemanticSDP		= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");
const OutgoingStreamTrack	= require("./OutgoingStreamTrack");
const TrackInfo			= SemanticSDP.TrackInfo;


/**
 * Represent the connection between a local udp port and a remote one. It sends and/or receive plain RTP data.
 */
class StreamerSession
{
	/**
	 * @ignore
	 * private constructor
	 */
	constructor(media,params)
	{
		this.session = new Native.RTPSessionFacade(media.getType().toLowerCase()==="audio" ? 0 : 1);
		
		//Set local params
		if (params && params.local && params.local.port)
			//Set it
			this.session.SetLocalPort(parseInt(params.local.port));
		
		//Set remote params
		if (params && params.remote && params.remote.ip && params.remote.port)
			//Set them
			this.session.SetRemotePort(params.remote.ip,params.remote.port);
		
		//Create new native properties object
		let properties = new Native.PropertiesFacade();

		//If we have got audio
		if (media)
		{
			let num = 0;
			//For each codec
			for (let codec of media.getCodecs().values())
			{
				//Item
				let item = "codecs."+num;
				//Put codec
				properties.SetProperty(item+".codec",codec.getCodec());
				properties.SetProperty(item+".pt",codec.getType());
				//If it has rtx
				if (codec.rtx)
					//Set rtx
					properties.SetProperty(item+".rtx",codec.getRTX());
				//one more
				num++;
			}
			//Set length
			properties.SetProperty("codecs.length", num);
		}
		
		//Init session
		this.session.Init(properties);
		
		//Create incoming and outgoing tracks
		this.incoming = new IncomingStreamTrack(Native.SessionToReceiver(this.session), new TrackInfo(media.getType(),media.getType()), {'':this.session.GetIncomingSourceGroup()});
		this.outgoing = new OutgoingStreamTrack(Native.SessionToSender(this.session), new TrackInfo(media.getType(),media.getType()), this.session.GetOutgoingSourceGroup()); 
		
		//Stop listeners
		this.incoming.on("stopped",()=>{
			this.incoming = null;
		});
		this.outgoing.on("stopped",()=>{
			this.outgoing = null;
		});
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Returns the incoming stream track associated with this streaming session
	 * @returns {IncomingStreamTrack}
	 */
	getIncomingStreamTrack()
	{
		return this.incoming;
	}
	
	/**
	 * Returns the outgoing stream track associated with this streaming session
	 * @returns {OutgoingStreamTrack}
	 */
	getOutgoingStreamTrack()
	{
		return this.outgoing;
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {StreamerSession} 
	 */
	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter.on.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Add event listener once
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStream} 
	 */
	once() 
	{
		//Delegate event listeners to event emitter
		this.emitter.once.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Remove event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {StreamerSession} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Closes udp socket and frees resources
	 */
	stop()
	{
		//Don't call it twice
		if (!this.session) return;
		
		//Stop tracks
		this.incoming && this.incoming.stop();
		this.outgoing && this.outgoing.stop();
		
		//End
		this.session.End();
		
		/**
		* StreamerSession stopped event
		*
		* @event StreamerSession#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.session = null;
	}
	
}

module.exports = StreamerSession;