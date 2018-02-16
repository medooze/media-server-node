const EventEmitter	= require('events').EventEmitter;

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
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Set incoming track
	 * @param {IncomingStreamTrakc} track
	 */
	setIncomingTrack(track) {
		//Check we are not already closed
		if (!this.transponder)
			//Error
			throw new Error("Transponder is already closed");
		
		//Check track
		if (!track)
			//Error
			throw new Error("Track can not be null");
		
		//Store new track info
		this.track = track;
		//Get track mute state
		this.mute(track.isMuted);
		//Get first source
		const source = this.track.encodings.values().next().value.source;
		//Start listening to it
		this.transponder.SetIncoming(source,track.receiver);
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
			this.transponder.Mute(muted);
			
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
	 * Select the simulcast encoding layer
	 * @param {String} encoding Id - rid value of the simulcast encoding of the track
	 */
	selectEncoding(encodingId) {
		//Get encoding 
		const encoding = this.track.encodings.get(encodingId);
		//If not found
		if (!encoding)
			//Error
			throw new Error("Encoding id ["+encodingId+"] not found on transpoder track");
		//Start listening to it
		this.transponder.SetIncoming(encoding.source,this.track.receiver);
	}
	
	/**
	 * Select SVC temporatl and spatial layers. Only available for VP9 media.
	 * @param {Number} spatialLayerId The spatial layer id to send to the outgoing stream
	 * @param {Number} temporalLayerId The temporaral layer id to send to the outgoing stream
	 */
	selectLayer(spatialLayerId,temporalLayerId)
	{
		//Call native interface
		this.transponder.SelectLayer(spatialLayerId,temporalLayerId);
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
		
		//Stop it
		this.transponder.Close();
		
		/**
		* Transponder stopped event
		*
		* @event Transponder#stopped
		* @type {object}
		*/
		this.emitter.emit("stopped");
		
		//Remove transport reference, so destructor is called on GC
		this.transponder = null;
		//Remove track referecne also
		this.track = null;
	}
	
};


module.exports = Transponder;