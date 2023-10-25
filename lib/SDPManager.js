const Emitter	= require("medooze-event-emitter");
const SemanticSDP	= require("semantic-sdp");

/** @typedef {import("./Transport")} Transport */

/** @typedef {"initial" | "local-offer" | "remote-offer" | "stable"} SDPState */

/**
 * @typedef {Object} SDPManagerEvents
 * @property {(self: SDPManager) => void} stopped
 * @property {(transport: Transport) => void} transport
 * @property {(transport: Transport) => void} renegotiationneeded
 */

/**
 * SDPManager
 * @extends {Emitter<SDPManagerEvents>}
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
		/** @type {SDPState} */
		this.state = "initial";

		/** @type {Transport | null} */
		this.transport = null;
	}
	
	/**
	 * Get current SDP offer/answer state 
	 */
	getState()
	{
		return this.state;
	}
	
	/**
	 * Returns the Transport object created by the SDP O/A
	 * @returns {Transport | null}
	 */
	getTransport()
	{
		return this.transport;
	}
	
	/**
	 * Create local description
	 * @return {String}
	 */
	createLocalDescription(){
		throw new Error('not implemented');
	}
	
	/**
	 * Process remote offer
	 * @param {String} sdp	- Remote session description
	 */
	processRemoteDescription(sdp){
		throw new Error('not implemented');
	}
	
	/**
	 * Stop manager and associated tranports
	 */
	stop()
	{
		this.emit("stopped",this);
	
		//Stop emitter
		super.stop();
	}
	
}

module.exports = SDPManager;
