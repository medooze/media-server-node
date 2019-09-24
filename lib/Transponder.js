const EventEmitter	= require("events").EventEmitter;
const LayerInfo		= require("./LayerInfo");

/**
 * Transponder copies data from an incoming track to an outgoing track and allows stream modifications
 */
class Transponder
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
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
			//If stopped already
			if (!this.transponder)
				//Do nothing
				return;
			//Dettach
			this.track = null;
			//Stop listening
			this.transponder.SetIncoming(null,null);
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
		
		//If removing track
		if (this.track)
		{
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
		} else {
			//Stop listening
			this.transponder.SetIncoming(null,null);
		}
	}
	
	
	/**
	 * Get attached track
	 * @returns {IncomingStreamTrack} track
	 */
	getIncomingTrack()
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
			* Transponder muted event
			*
			* @name muted
			* @memberof Transponder
			* @kind event
			* @argument {Transponder}  transponder
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
	 * @returns {Number} Current bitrate of the selected encoding and layers, it aslo incudes the selected layer indexes and available layers as properties of the Number object.
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
		
		//Helper for retrieving spatial info
		const getSpatialLayerId = function(layer) {
			// Either spatialLayerId on SVC stream or simulcastIdx on simulcast stream
			return layer.spatialLayerId!=LayerInfo.MaxLayerId ? layer.spatialLayerId : layer.simulcastIdx ;
		};
	
		//Depending on the traversal method
		switch (options && options.traversal)
		{
			case "spatial-temporal":
				ordering = (a,b) => ((getSpatialLayerId(b)*LayerInfo.MaxLayerId+b.temporalLayerId) - (getSpatialLayerId(a)*LayerInfo.MaxLayerId+a.temporalLayerId));
				break;
			case "zig-zag-spatial-temporal":
				ordering = (a,b) => (((getSpatialLayerId(b)+b.temporalLayerId+1)*LayerInfo.MaxLayerId-b.temporalLayerId) - ((getSpatialLayerId(a)+a.temporalLayerId+1)*LayerInfo.MaxLayerId-a.temporalLayerId));
				break;
			case "temporal-spatial":
				ordering = (a,b) => ((b.temporalLayerId*LayerInfo.MaxLayerId+getSpatialLayerId(b)) - (a.temporalLayerId*LayerInfo.MaxLayerId+getSpatialLayerId(a)));
				break;
			case "zig-zag-temporal-spatial":
				ordering = (a,b) => (((getSpatialLayerId(b)+b.temporalLayerId+1)*LayerInfo.MaxLayerId-getSpatialLayerId(b)) - ((getSpatialLayerId(a)+a.temporalLayerId+1)*LayerInfo.MaxLayerId-getSpatialLayerId(a)));
				break;
			default:
				//Default
		}
		
		//Get all active layers 
		const info = this.track.getActiveLayers();
		
		//Get layers 
		const layers = ordering ? info.layers.sort(ordering) : info.layers;
		
		//If there are no layers
		if (!layers.length)
		{
			//mute us
			this.mute(false);
			//Done
			return 0;
		}
		
		//selected layer index
		let layerMinIndex = 0;
		let layerIndex = 0;
		//Try to do layer selection instead
		for (let layer of layers)
		{
			//If this layer is better than the one before
			if (layer.bitrate<=target && layer.bitrate>current &&
			    this.maxSpatialLayerId>=layer.spatialLayerId && this.maxTemporalLayerId>=layer.temporalLayerId)
			{
				//Use it as is
				encodingId	= layer.encodingId;
				spatialLayerId	= layer.spatialLayerId;
				temporalLayerId	= layer.temporalLayerId;
				//Update max current bitrate
				current = layer.bitrate;
				//we don't want to look more
				break;
			}
			//Check if it is the minimum
			if (layer.bitrate && layer.bitrate<min &&
			    this.maxSpatialLayerId>=layer.spatialLayerId && this.maxTemporalLayerId>=layer.temporalLayerId)
			{
				//Use it as min
				layerMinIndex		= layerIndex;
				encodingIdMin		= layer.encodingId;
				spatialLayerIdMin	= layer.spatialLayerId;
				temporalLayerIdMin	= layer.temporalLayerId;
				//Update min bitrate
				min = layer.bitrate;
			}
			//Next
			layerIndex++;
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
				return Object.assign(new Number(min),{
					layer		: layers[layerMinIndex],
					layerIndex	: layerMinIndex,
					encodingId	: encodingIdMin,
					spatialLayerId	: spatialLayerIdMin,
					temporalLayerId	: temporalLayerIdMin,
					layers		: layers
				});
			} else {
				//Mute it
				this.mute(true);
				//Not sending anything
				return Object.assign(new Number(0),{
					layerIndex	: -1,
					layers		: layers
				});
			}
		}
		//Unmute (jic)
		this.mute(false);
		//Select enccoding
		this.selectEncoding(encodingId);
		//And temporal/spatial layers
		this.selectLayer(spatialLayerId,temporalLayerId);
		//Return current bitrate for selected encoding/layer
		return Object.assign(new Number(current),{
			layer		: layers[layerIndex],
			layerIndex	: layerIndex,
			encodingId	: encodingId,
			spatialLayerId	: spatialLayerId,
			temporalLayerId	: temporalLayerId,
			layers		: layers
		});
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
	getSelectedtEncoding() 
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
		* @name stopped
		* @memberof Transponder
		* @kind event
		* @argument {Transponder}  transponder
		*/
		this.emitter.emit("stopped",this);
		
		//Remove transport reference, so destructor is called on GC
		this.transponder = null;
		//Remove track referecne also
		this.track = null;
	}
	
};


module.exports = Transponder;
