const Emitter	= require("medooze-event-emitter");
const StreamerSession	= require("./StreamerSession");
/**
 * An streamer allows to send and receive plain RTP over udp sockets.
 * This allows both to bridge legacy enpoints or integrate streaming/broadcasting services.
 */
class Streamer extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(ip)
	{
		//Init emitter
		super();

		//Store ip address of the endpoint
		this.ip = ip;
		//Sessions set
		this.sessions = new Set();
	}
	
	/**
	 * Creates a new streaming session from a media description
	 * @param {MediaInfo} media - Media codec description info
	 * @param {Object} params		- Network parameters [Optional]
	 * @param {Object} params.local		- Local parameters
	 * @param {Number} params.local.port	- receiving port
	 * @param {Object} params.remote	- Remote parameters
	 * @param {String} params.remote.ip	- Sending ip address
	 * @param {Number} params.remote.port	- Sending port
	 * @param {Number} params.noRTCP	- Disable sending rtcp
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
		this.emit("stopped",this);

		//Stop emitter
		super.stop();
		
		//Clear set jic
		this.sessions.clear();
	}
}

module.exports = Streamer;	
