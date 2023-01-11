const Native			= require("./Native");
const SharedPointer		= require("./SharedPointer");
const Emitter		= require("./Emitter");
const SemanticSDP		= require("semantic-sdp");
const IncomingStreamTrack	= require("./IncomingStreamTrack");
const OutgoingStreamTrack	= require("./OutgoingStreamTrack");
const TrackInfo			= SemanticSDP.TrackInfo;


/**
 * Represent the connection between a local udp port and a remote one. It sends and/or receive plain RTP data.
 */
class StreamerSession extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(media,params)
	{
		//Init emitter
		super();

		//Create session
		this.session = new Native.RTPSessionFacadeShared(media.getType().toLowerCase()==="audio" ? 0 : 1);
		//Set local params
		if (params && params.local && params.local.port)
			//Set it
			this.session.SetLocalPort(parseInt(params.local.port));
		
		//Set remote params
		if (params && params.remote && params.remote.ip && params.remote.port)
			//Set them
			this.session.SetRemotePort(String(params.remote.ip), parseInt(params.remote.port));
		
		//Create new native properties object
		let properties = new Native.Properties();

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
				properties.SetProperty(item+".codec"	, String(codec.getCodec()));
				properties.SetProperty(item+".pt"	, parseInt(codec.getType()));
				//If it has rtx
				if (codec.rtx)
					//Set rtx
					properties.SetProperty(item+".rtx", parseInt(codec.getRTX()));
				//one more
				num++;
			}
			//Set length
			properties.SetProperty("codecs.length", num);
		}
		
		//Check if we have to disable RTCP
		if (params && !!params.noRTCP)
			//Disable it
			properties.SetProperty("properties.useRTCP"	, 0);

		//Init session
		this.session.Init(properties);
		
		//Create incoming and outgoing tracks
		this.incoming = new IncomingStreamTrack(media.getType(), media.getType(), "", this.session.GetTimeService(), this.session.toRTPReceiver(), {'':SharedPointer(this.session.GetIncomingSourceGroup())});
		this.outgoing = new OutgoingStreamTrack(media.getType(), media.getType(), "", this.session.toRTPSender(), SharedPointer(this.session.GetOutgoingSourceGroup())); 
		
		//Try to get h264 codec
		const h264 = media.getCodec("h264");
		
		//if it is h264 and has the sprop-parameter
		if (h264 && h264.hasParam("sprop-parameter-sets"))
			//Set h264 props
			this.incoming.setH264ParameterSets(h264.getParam("sprop-parameter-sets"));
		
		//Stop listeners
		this.incoming.once("stopped",()=>{
			this.incoming = null;
		});
		this.outgoing.once("stopped",()=>{
			this.outgoing = null;
		});
	}
	
	/**
	 * Get the local rtp/udp port
	 * @returns {Number} port number
	 */
	getLocalPort()
	{
		return this.session.GetLocalPort();
	}
	
	/**Set the rempte rtp/udp ip and port
	 * 
	 */
	setRemote(ip,port)
	{
		//Set them
		this.session.SetRemotePort(String(ip),parseInt(port));
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
		* @name stopped
		* @memberof StreamerSession
		* @kind event
		* @argument {StreamerSession} session
		*/
		this.emitter.emit("stopped",this);
		
		//Stop emitter
		super.stop();
		
		//Remove transport reference, so destructor is called on GC
		this.session = null;
	}
	
}

module.exports = StreamerSession;
