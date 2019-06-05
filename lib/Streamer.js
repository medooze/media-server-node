const EventEmitter	= require('events').EventEmitter;
const StreamerSession	= require("./StreamerSession");
/**
 * An streamer allows to send and receive plain RTP over udp sockets.
 * This allows both to bridge legacy enpoints or integrate streaming/broadcasting services.
 */
class Streamer 
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(ip)
	{
		//Store ip address of the endpoint
		this.ip = ip;
		//Sessions set
		this.sessions = new Set();
		//Create event emitter
		this.emitter = new EventEmitter();
	}
	
	/**
	 * Creates a new streaming session from a media description
	 * @param {MediaInfo} media - Media codec description info
	 * @param {Object} params		- Network parameters
	 * @param {Object} params.local		- Local parameters
	 * @param {Number} params.local.port	- receiving port
	 * @param {Object} params.remote	- Remote parameters
	 * @param {String} params.remote.ip	- Sending ip address
	 * @param {Number} params.remote.port	- Sending port
	 * @returns {StreamerSession} The new streaming session
	 */
	createSession(media,params)
	{
		//Create session
		const session = new StreamerSession(media,params);
		
		//Add listener
		session.once("stopped",()=>{
			//Remove from set
			this.sessions.delete(session);
		});
		//Store it
		this.sessions.add(session);
		
		//Return it
		return session;
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listeener	- Event listener
	 * @returns {Endpoint} 
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
	 * @returns {Endpoint} 
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
	 * @returns {Endpoint} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Stop all streaming sessions and frees resources
	 */
	stop() 
	{
		//Stop all sessions
		for (let session of this.sessions.values())
			//stop
			session.stop();
	
		/**
		* Streamer stopped event
		*
		* @name stopped
		* @memberof Streamer
		* @kind event
		* @argument {Streamer} streamer
		*/
		this.emitter.emit("stopped",this);
		
		//Clear set jic
		this.sessions.clear();
	}
}

module.exports = Streamer;	
