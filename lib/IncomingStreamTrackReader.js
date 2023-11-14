const Native		= require("./Native");
const Emitter		= require("medooze-event-emitter");
const Refresher		= require("./Refresher")
const SharedPointer	= require("./SharedPointer");
const IncomingStreamTrack = require("./IncomingStreamTrack");

/** @typedef {"Audio" | "Video" | "Text" | "Unknown"} FrameType */

/**
 * @typedef {Object} Frame
 * @property {FrameType} type
 * @property {string} codec
 * @property {Uint8Array} buffer
 */

/**
 * @typedef {Object} IncomingStreamTrackReaderEvents
 * @property {(self: IncomingStreamTrackReader) => void} stopped
 * @property {(frame: Frame, self: IncomingStreamTrackReader) => void} frame
 */

/** @extends {Emitter<IncomingStreamTrackReaderEvents>} */
class IncomingStreamTrackReader extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {boolean} */ intraOnly,
		/** @type {number} */ minPeriod,
		/** @type {boolean} */ ondemand)
	{
		//Init emitter
		super();
		//Store properties
		this.intraOnly = intraOnly;
		this.minPeriod = minPeriod;
		//Create decoder
		this.reader = SharedPointer(new Native.MediaFrameReaderShared(this,intraOnly,minPeriod,!!ondemand));

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
		this.onframe = (
			/** @type {Uint8Array} */ buffer,
			/** @type {FrameType} */ type,
			/** @type {string} */ codec,
		) => {
			this.emit("frame", {buffer,type,codec}, this);
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
			this.attached.depacketizer.RemoveMediaListener(this.reader.toMediaFrameListener());
			//remove listener
			this.attached.off("stopped",this.ontrackstopped);
			
		}
		//Not attached
		this.attached = null;
	}
	
	attachTo(/** @type {IncomingStreamTrack | undefined} */ track)
	{
		//Detach first
		this.detach();
		
		//Check if valid object
		if (track)
		{
			//Signal reader to grab next one
			this.reader.GrabNextFrame();
			//Add frame listener
			track.depacketizer.AddMediaListener(this.reader.toMediaFrameListener());
			//Listen for events
			track.once("stopped",this.ontrackstopped);
			//Keep attached object
			this.attached = track;
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

		this.emit("stopped", this);
		
		//Stop emitter
		super.stop();
		
		//Remove native refs
		//@ts-expect-error
		this.reader = null;
	}
}

module.exports = IncomingStreamTrackReader;
