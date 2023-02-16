const Native		= require("./Native");
const Emitter		= require("./Emitter");
const Refresher		= require("./Refresher")

class IncomingStreamTrackReader extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(intraOnly,minPeriod,ondemand)
	{
		//Init emitter
		super();
		//Store properties
		this.intraOnly = intraOnly;
		this.minPeriod = minPeriod;
		//Create decoder
		this.reader = new Native.MediaFrameReaderShared(this,intraOnly,minPeriod,!!ondemand);

		//Check if we need to create a refresher for requesting intra periodically
		if (this.minPeriod>0)
			//Create one
			this.refresher = new Refresher(this.minPeriod);

		//If we only want intra frames done exactly after refresh
		if (intraOnly && ondemand)
			//Just before
			this.refresher?.on("refreshing",()=>{
				//Signal reader to grab next one
				this.reader.GrabNextFrame();
			});

		//Track listener
		this.ontrackstopped = ()=>{
			//Dettach
			this.detach();
		};
		//Frame listener
		this.onframe = (buffer,type,codec) => {
			/**
			* AudioDecoder stopped event
			*
			* @name stopped
			* @memberof IncomingStreamTrackReader
			* @kind event
		        * @argument {Object} frame
			* @argument {IncomingStreamTrackReader} reader
			*/
			this.emitter.emit("frame", {buffer,type,codec}, this);
			//Reset refresher interval
			this.refresher?.restart(this.minPeriod);
		}
	}

	grabNextFrame()
	{
		//Signal reader to grab next one
		this.reader.GrabNextFrame();
	}

	detach()
	{
		//If attached to a decoder
		if (this.attached)
		{
			//Stop periodic refresh
			this.refresher?.remove(this.attached);
			//remove frame listener
			this.depacketizer.RemoveMediaListener(this.reader.toMediaFrameListener());
			//remove listener
			this.attached.off("stopped",this.ontrackstopped);
			
		}
		//Not attached
		this.attached = null;
		this.depacketizer = null;
	}
	
	attachTo(track)
	{
		//Detach first
		this.detach();
		
		//Check if valid object
		if (track)
		{
			//Signal reader to grab next one
			this.reader.GrabNextFrame();
			//Get first encoding
			const encoding = track.encodings.values().next();
			//Add frame listener
			encoding.value.depacketizer.AddMediaListener(this.reader.toMediaFrameListener());
			//Listen for events
			track.once("stopped",this.ontrackstopped);
			//Keep attached object
			this.attached = track;
			this.depacketizer = encoding.value.depacketizer;
			//Do periodic refresh
			this.refresher?.add(track);
		}
	}

	stop()
	{
		//Don't call it twice
		if (this.stopped) return;
		
		//Stop
		this.stopped = true;

		//Detach first
		this.detach();
		
		//Stop refresher
		this.refresher?.stop();

		/**
		* AudioDecoder stopped event
		*
		* @name stopped
		* @memberof IncomingStreamTrackReader
		* @kind event
		* @argument {IncomingStreamTrackReader} reader
		*/
		this.emitter.emit("stopped", this);
		
		//Stop emitter
		super.stop();
		
		//Remove native refs
		this.reader = null;
	}
}

module.exports = IncomingStreamTrackReader;
