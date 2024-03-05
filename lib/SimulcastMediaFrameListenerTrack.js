
const Emitter		= require("medooze-event-emitter");
const Native 		= require("./Native");
const SharedPointer	= require("./SharedPointer");
const IncomingStreamTrack = require("./IncomingStreamTrack");


/**
 * @typedef {Object} SimulcastMediaFrameListenerTrackEvents
 * @property {(self: SimulcastMediaFrameListenerTrack) => void} stopped
 */

/**
 * Audio or Video track of a remote media stream
 * @extends {Emitter<SimulcastMediaFrameListenerTrackEvents>}
 */
class SimulcastMediaFrameListenerTrack extends Emitter
{	

	constructor(/** @type {Native.TimeService} */ timeService, 
		/** @type {IncomingStreamTrack[]}*/layers)
	{
		//Init emitter
		super();

		if (layers.length > 1)
		{
			this.depacketizer = SharedPointer(new Native.SimulcastMediaFrameListenerShared(timeService, 1, layers.length));
			
			for (const layer of layers)
			{
				this.depacketizer.AttachTo(layer.depacketizer.toMediaFrameProducer());
			}
			
		}
		else
			this.depacketizer = layers[0].depacketizer;
		
		this.layers = layers;
	}
	
	/**
	 * @returns {string} The media type
	 */
	getMedia()
	{
		return "video";
	}
	
	/**
	 * Stop the track
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Stopped
		this.stopped = true;
		
		//Stop global depacketizer
		if (this.depacketizer) this.depacketizer.Stop();
		
		this.emit("stopped",this);
		
		//Stop emitter
		super.stop();
		
		//@ts-expect-error
		this.depacketizer = null;
		
		//Remove transport reference, so destructor is called on GC
		//@ts-expect-error
		this.receiver = null;
	}
}

module.exports = SimulcastMediaFrameListenerTrack;