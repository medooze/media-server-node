const EventEmitter	= require('events').EventEmitter;

class Emitter
{
	constructor()
	{
		//Create event emitter
		this.emitter = new EventEmitter();
		//Remove limit
		this.emitter.setMaxListeners(0);
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listeener	- Event listener
	 * @returns {Transport} 
	 */
	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter?.on.apply(this.emitter, arguments);  
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
		this.emitter?.once.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Remove event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {Transport} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter?.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	
	stop()
	{
		//Remove listeners
		this.emitter.removeAllListeners();
		//Free mem
		this.emitter = null;
	}
	
}

module.exports = Emitter;
