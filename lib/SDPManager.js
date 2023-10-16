const Emitter	= require("medooze-event-emitter");

/**
 * SDPManager
 */
class SDPManager extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor()
	{
		//Init emitter
		super();

		//SDP O/A state
		this.state = "initial";
	}
	
	/**
	 * Get current SDP offer/answer state 
	 * @returns {String} one of "initial","local-offer","remote-offer","stabable".
	 */
	getState()
	{
		return this.state;
	}
	
	/**
	 * Returns the Transport object created by the SDP O/A
	 * @returns {Transport}
	 */
	getTransport()
	{
		return this.transport;
	}
	
	/*
	 * Create local description
	 * @return {String}
	 */
	createLocalDescription(){}
	
	/*
	 * Process remote offer
	 * @param {String} sdp	- Remote session description
	 */
	processRemoteDescription(sdp){}
	
	/**
	 * Stop manager and associated tranports
	 */
	stop()
	{
		/**
		* SDPManager stopped event
		*
		* @name stopped
		* @memberof SDPManager
		* @kind event
		* @argument {SDPManager}  transport
		*/
		this.emit("stopped",this);
	
		//Stop emitter
		super.stop();
	}
	
}

module.exports = SDPManager;
