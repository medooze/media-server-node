const EventEmitter	= require("events").EventEmitter;
const LayerInfo		= require("./LayerInfo");

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
		this.spatialLayerId = LayerInfo.MaxLayerId;
		this.temporalLayerId = LayerInfo.MaxLayerId;
		this.maxSpatialLayerId = LayerInfo.MaxLayerId;
		this.maxTemporalLayerId = LayerInfo.MaxLayerId;
		
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
	 * @param {IncomingStreamTrack} track
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
		this.encodingId		= encoding.first;
		this.spatialLayerId	= LayerInfo.MaxLayerId;
		this.temporalLayerId	= LayerInfo.MaxLayerId;
		this.maxSpatialLayerId	= LayerInfo.MaxLayerId;
		this.maxTemporalLayerId = LayerInfo.MaxLayerId;
		
		//Add stop listener
		this.track.once("stopped",this.onAttachedTrackStopped);
		
		//Singal track is attached
		this.track.attached();
	}
	
	
	/**
	 * Get attached track
	 * @returns {IncomingStreamTrack} track
	 */
	getIncommingTrack()
	{
		return this.track;
	}
	
	/**
	 * Get available encodings and layers
	 * @returns {Object} 
	 */
	getAvailableLayers()
	{
		return this.track ? this.track.getActiveLayers() : null;
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
			* @event Transponder#muted
			* @type {object}
			*/
			this.emitter.emit("muted",this.muted);
		}
	}
	
	/*
	 * Select encoding and temporal and spatial layers based on the desired bitrate. This operation will unmute the transponder if it was mutted and it is possible to select an encoding and layer based on the target bitrate and options.
	 * 
	 * @param {Number} bitrate
	 * @param {Object} options - Options for configuring algorithm to select best encoding/layers [Optional]
	 * @param {Object} options.traversal - Traversal algorithm "default", "spatial-temporal", "zig-zag-spatial-temporal", "temporal-spatial", "zig-zag-temporal-spatial" [Default: "default"]
	 * @param {Object} options.strict    - If there is not a layer with a bitrate lower thatn target, stop sending media [Default: false]
	 * @returns {Number} Current bitrate of the selected encoding and layers
	 */
	setTargetBitrate(target, options) 
	{
		//Check track
		if (!this.track)
			//Ignore
			return;
		
		//For optimum fit
		let current		= -1;
		let encodingId		= "";
		let spatialLayerId	= LayerInfo.MaxLayerId;
		let temporalLayerId	= LayerInfo.MaxLayerId;
		//For minimum fit
		let min			= Number.MAX_SAFE_INTEGER;
		let encodingIdMin	= "";
		let spatialLayerIdMin	= LayerInfo.MaxLayerId;
		let temporalLayerIdMin	= LayerInfo.MaxLayerId;
		
		let ordering = false;
		let breakOnFirst = false;
		//Depending on the traversal method
		switch (options && options.traversal)
		{
			case "spatial-temporal":
				//Ordering algorithm
				ordering = (a,b) => ((b.spatialLayerId*LayerInfo.MaxLayerId+b.temporalLayerId) - (a.spatialLayerId*LayerInfo.MaxLayerId+a.temporalLayerId));
				breakOnFirst = true;
				break;
			case "zig-zag-spatial-temporal":
				ordering = (a,b) => (((b.spatialLayerId+b.temporalLayerId+1)*LayerInfo.MaxLayerId-b.temporalLayerId) - ((a.spatialLayerId+a.temporalLayerId+1)*LayerInfo.MaxLayerId-a.temporalLayerId));
				breakOnFirst = true;
				break;
			case "temporal-spatial":
				ordering = (a,b) => ((b.temporalLayerId*LayerInfo.MaxLayerId+b.spatialLayerId) - (a.temporalLayerId*LayerInfo.MaxLayerId+a.spatialLayerId));
				breakOnFirst = true;
				break;
			case "zig-zag-temporal-spatial":
				ordering = (a,b) => (((b.spatialLayerId+b.temporalLayerId+1)*LayerInfo.MaxLayerId-b.spatialLayerId) - ((a.spatialLayerId+a.temporalLayerId+1)*LayerInfo.MaxLayerId-a.spatialLayerId));
				breakOnFirst = true;
				break;
			default:
				//Default
		}
		
		//Get stats 
		const stats = this.track.getStats();
		
		//For all encodings
		outher: for (const id in stats)
		{
		
			//Check if we can use this without layer selection
			if (stats[id].media.bitrate<=target && stats[id].bitrate>current &&
			    this.maxSpatialLayerId>=LayerInfo.MaxLayerId && this.maxTemporalLayerId>=LayerInfo.MaxLayerId)
			{
				//Use it
				encodingId	= id;
				spatialLayerId	= LayerInfo.MaxLayerId;
				temporalLayerId	= LayerInfo.MaxLayerId;
				//Update max current bitrate
				current = stats[id].bitrate;
			}
			//Check if it is the minimum
			if (stats[id].media.bitrate && stats[id].media.bitrate<min &&
			    this.maxSpatialLayerId>=LayerInfo.MaxLayerId && this.maxTemporalLayerId>=LayerInfo.MaxLayerId)
			{
				//Use it as min
				encodingIdMin		= id;
				spatialLayerIdMin	= LayerInfo.MaxLayerId;
				temporalLayerIdMin	= LayerInfo.MaxLayerId;
				//Update min bitrate
				min = stats[id].bitrate;
			}
			//Get layers
			const layers = ordering ? stats[id].media.layers.sort(ordering) : stats[id].media.layers; 

			//Try to do layer selection instead
			for (let i=0;i<layers.length;++i)
			{
				//Check if we can use this without layer selection
				if (layers[i].bitrate<=target && layers[i].bitrate>current &&
				    this.maxSpatialLayerId>=layers[i].spatialLayerId && this.maxTemporalLayerId>=layers[i].temporalLayerId)
				{
					//Use it as is
					encodingId	= id;
					spatialLayerId	= layers[i].spatialLayerId;
					temporalLayerId	= layers[i].temporalLayerId;
					//Update max current bitrate
					current = layers[i].bitrate;
					//If we don't want to look more
					if (breakOnFirst)
						break outher;
				}
				//Check if it is the minimum
				if (layers[i].bitrate && layers[i].bitrate<min &&
				    this.maxSpatialLayerId>=layers[i].spatialLayerId && this.maxTemporalLayerId>=layers[i].temporalLayerId)
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
			//If we can use the minimun
			if (!options || !options["strict"])
			{
				//Unmute (jic)
				this.mute(false);
				//Select mimimun as no layer is able to match the desired bitrate
				this.selectEncoding(encodingIdMin);
				//And temporal/spatial layers
				this.selectLayer(spatialLayerIdMin,temporalLayerIdMin);
				//Return minimun bitrate for selected encoding/layer
				return min;
			} else {
				//Mute it
				this.mute(true);
				//Not sending anything
				return 0;
			}
		}
		//Unmute (jic)
		this.mute(false);
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
	 * Return the encoding that is being forwarded
	 * @returns {String} encodingId
	 */
	geSelectedtEncoding() 
	{
		// Return the encoding that is being forwarded
		return this.encodingId;
	}
	
	/**
	 * Return the spatial layer id that is being forwarded 
	 * @returns {Number} spatial layer id
	 */
	getSelectedSpatialLayerId()
	{
		// Return the spatial layer id that is being forwarded
		return this.spatialLayerId;
	}
	
	/**
	 * Return the temporal layer id that is being forwarded
	 * @returns {Number} temporal layer id
	 */
	getSelectedTemporalLayerId()
	{
		// Return the temporal layer id that is being forwarded
		return this.temporalLayerId;
	}
	
	/**
	 * Select SVC temporatl and spatial layers. Only available for VP9 media.
	 * @param {Number} spatialLayerId The spatial layer id to send to the outgoing stream
	 * @param {Number} temporalLayerId The temporaral layer id to send to the outgoing stream
	 */
	selectLayer(spatialLayerId,temporalLayerId)
	{
		//Limit with max layers allowed
		if (this.maxSpatialLayerId)
			spatialLayerId  = Math.min(spatialLayerId,this.maxSpatialLayerId);
		if (this.maxTemporalLayerId)
			temporalLayerId = Math.min(temporalLayerId,this.maxTemporalLayerId);
		
		//Check if not changed
		if (this.spatialLayerId===spatialLayerId && this.temporalLayerId===temporalLayerId)
			//Nothing
			return;
		
		//Call native interface
		this.transponder.SelectLayer(spatialLayerId,temporalLayerId);
		
		//Store new values
		this.spatialLayerId = spatialLayerId;
		this.temporalLayerId = temporalLayerId;
	}

	/**
	 * Set maximum statial and temporal layers to be forwrarded. Base layer is always enabled.
	 * @param {Number} maxSpatialLayerId  - Max spatial layer id
	 * @param {Number} maxTemporalLayerId - Max temporal layer id
	 */
	setMaximumLayers(maxSpatialLayerId,maxTemporalLayerId)
	{
		//Check both are higher layers than the base layer
		if (maxSpatialLayerId<0 || maxTemporalLayerId<0)
			//Error
			throw new Error("Maximum layers not allowed, base layer (0,0) must be always enabled");
		//Store them
		this.maxSpatialLayerId  = maxSpatialLayerId;
		this.maxTemporalLayerId = maxTemporalLayerId;
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