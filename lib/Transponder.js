const EventEmitter	= require('events').EventEmitter;

const MaxLayerId = 0xFF;

/**
 * Transponder copies data from an incoming track to an outgoing track and allows stream modifications
 */
class Transponder
{
	constructor(transponder)
	{
		//Store native trasnceiver
		this.transponder = transponder; 
		//No track
		this.track = null;
		this.muted = false;
		this.spatialLayerId = MaxLayerId;
		this.temporalLayerId = MaxLayerId;
		
		//The listener for attached tracks end event
		this.onAttachedTrackStopped = () => {
			//Stop
			this.stop();
		};
		
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Set incoming track
	 * @param {IncomingStreamTrakc} track
	 */
	setIncomingTrack(track)
	{
		//Check we are not already closed
		if (!this.transponder)
			//Error
			throw new Error("Transponder is already closed");
		
		//Check track
		if (!track)
			//Error
			throw new Error("Track can not be null");
		
		//If was previously attached
		if (this.track)
		{
			//Remove stop listener
			this.track.off("stopped",this.onAttachedTrackStopped);
			//Signal dettached
			this.track.detached();
		}
		
		//Store new track info
		this.track = track;
		
		//Get first encoding
		const encoding = this.track.encodings.values().next();
		
		//Start listening to it
		this.transponder.SetIncoming(encoding.value.source,track.receiver);
		
		//Store current values
		this.encodingId = encoding.first;
		this.spatialLayerId = MaxLayerId;
		this.temporalLayerId = MaxLayerId;
		
		//Add stop listener
		this.track.once("stopped",this.onAttachedTrackStopped);
		
		//Singal track is attached
		this.track.attached();
	}
	
	
	/**
	 * Check if the track is muted or not
	 * @returns {boolean} muted
	 */
	isMuted()
	{
		return this.muted;
	}
	
	/*
	 * Mute/Unmute track
	 * This operation will not change the muted state of the stream this track belongs too.
	 * @param {boolean} muting - if we want to mute or unmute
	 */
	mute(muting) 
	{
		//If we are different
		if (this.muted!==muting)
		{
			//Store it
			this.muted = muting;
			
			//Call native transponder
			this.transponder && this.transponder.Mute(muting);
			
			/**
			* OutgoingStreamTrack stopped event
			*
			* @event OutgoingStreamTrack#stopped
			* @type {object}
			*/
			this.emitter.emit("muted",this.muted);
		}
	}
	
	/*
	 * Select encoding and temporal and spatial layers based on the desired bitrate
	 * 
	 * @param {Number} bitrate
	 * @returns {Number}
	 */
	setTargetBitrate(target) 
	{
		//Check track
		if (!this.track)
			//Ignore
			return;
		
		//For optimum fit
		let current		= -1;
		let encodingId		= "";
		let spatialLayerId	= MaxLayerId;
		let temporalLayerId	= MaxLayerId;
		//For minimum fit
		let min			= Number.MAX_SAFE_INTEGER;
		let encodingIdMin	= "";
		let spatialLayerIdMin	= MaxLayerId;
		let temporalLayerIdMin	= MaxLayerId;
		
		//Get incoming track stats
		const stats = this.track.getStats();

		//For all encodings
		for (const id in stats)
		{
			//Check if we can use this without layer selection
			if (stats[id].media.bitrate<target && stats[id].bitrate>current)
			{
				//Use it
				encodingId	= id;
				spatialLayerId	= MaxLayerId;
				temporalLayerId	= MaxLayerId;
				//Update max current bitrate
				current = stats[id].bitrate;
			}
			//Check if it is the minimum
			if (stats[id].media.bitrate && stats[id].media.bitrate<min)
			{
				//Use it as min
				encodingIdMin		= id;
				spatialLayerIdMin	= MaxLayerId;
				temporalLayerIdMin	= MaxLayerId;
				//Update min bitrate
				min = stats[id].bitrate;
			}
			//Get layers
			const layers = stats[id].media.layers; 
			//Try to do layer selection instead
			for (let i=0;i<layers.length;++i)
			{
				//Check if we can use this without layer selection
				if (layers[i].bitrate<target && layers[i].bitrate>current)
				{
					//Use it as is
					encodingId	= id;
					spatialLayerId	= layers[i].spatialLayerId;
					temporalLayerId	= layers[i].temporalLayerId;
					//Update max current bitrate
					current = layers[i].bitrate;
				}
				//Check if it is the minimum
				if (layers[i].bitrate && layers[i].bitrate<min)
				{
					//Use it as min
					encodingIdMin		= id;
					spatialLayerIdMin	= layers[i].spatialLayerId;
					temporalLayerIdMin	= layers[i].temporalLayerId;
					//Update min bitrate
					min = layers[i].bitrate;
				}
			}
		}

		//Check if we have been able to find a layer that matched the target bitrate
		if (current<=0)
		{
			//Select mimimun as no layer is able to match the desired bitrate
			this.selectEncoding(encodingIdMin);
			//And temporal/spatial layers
			this.selectLayer(spatialLayerIdMin,temporalLayerIdMin);
			//Return minimun bitrate for selected encoding/layer
			return min;
		}
		//Select enccoding
		this.selectEncoding(encodingId);
		//And temporal/spatial layers
		this.selectLayer(spatialLayerId,temporalLayerId);
		//Return current bitrate for selected encoding/layer
		return current;
	}
	
	/*
	 * Select the simulcast encoding layer
	 * @param {String} encoding Id - rid value of the simulcast encoding of the track
	 */
	selectEncoding(encodingId) 
	{
		//If not changed
		if (this.encodingId==encodingId)
			//Do nothing
			return;
		//Get encoding 
		const encoding = this.track.encodings.get(encodingId);
		//If not found
		if (!encoding)
			//Error
			throw new Error("Encoding id ["+encodingId+"] not found on transpoder track");
		//Start listening to it
		this.transponder.SetIncoming(encoding.source,this.track.receiver);
		//store encoding
		this.encodingId = encodingId;
	}
	
	/**
	 * Select SVC temporatl and spatial layers. Only available for VP9 media.
	 * @param {Number} spatialLayerId The spatial layer id to send to the outgoing stream
	 * @param {Number} temporalLayerId The temporaral layer id to send to the outgoing stream
	 */
	selectLayer(spatialLayerId,temporalLayerId)
	{
		//Check if changed
		if (this.spatialLayerId==spatialLayerId && this.temporalLayerId==temporalLayerId)
			//Nothing
			return;
		//Call native interface
		this.transponder.SelectLayer(spatialLayerId,temporalLayerId);
		//Store new values
		this.spatialLayerId = MaxLayerId;
		this.temporalLayerId = MaxLayerId;
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {IncomingStreamTrack} 
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
	 * @returns {IncomingStreamTrack} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Stop this transponder, will dettach the OutgoingStreamTrack
	 */
	stop()
	{
		//Don't call it twice
		if (!this.transponder) return;
		
		//If was previously attached
		if (this.track)
		{
			//Remove stop listener
			this.track.off("stopped",this.onAttachedTrackStopped);
			//Signal dettached
			this.track.detached();
		}
		
		//Stop it
		this.transponder.Close();
		
		/**
		* Transponder stopped event
		*
		* @event Transponder#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped",this);
		
		//Remove transport reference, so destructor is called on GC
		this.transponder = null;
		//Remove track referecne also
		this.track = null;
	}
	
};


module.exports = Transponder;