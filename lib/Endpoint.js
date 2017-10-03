// Open the native interace
var native = require("../build/Release/medooze-media-server");

const Transport		= require("./Transport");
const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;

/**
 * An endpoint represent an UDP server socket.
 * The endpoint will process STUN requests in order to be able to associate the remote ip:port with the registered transport and forward any further data comming from that transport.
 * Being a server it is ICE-lite.
 */
class Endpoint 
{
	/**
	 * @ignore
	 * private constructor
	 */
	constructor(ip)
	{
		//Store ip address of the endpoint
		this.ip = ip;
		//Create native endpoint
		this.bundle = new native.RTPBundleTransport();
		//Start it
		this.bundle.Init();
		//Store all transports
		this.transports = new Set();
		//Create candidate
		this.candidate = new CandidateInfo(1, 1, "UDP", 33554431, ip, this.bundle.GetLocalPort(), "host");
		//Get fingerprint (global at media server level currently)
		this.fingerprint = native.MediaServer.GetFingerprint().toString();
	}
	
	/**
	 * Create a new transport object and register it with the remote ICE username and password
	 * @param {Object} remote		- Remote ICE and DTLS properties
	 * @param {ICEInfo} remote.ice		- Remote ICE info, containing the username and password.
	 * @param {DTLSInfo} remote.dtls	- Remote DTLS info
	 * @param {Array.CandidateInfo} remote.candiadtes - Remote DTLS candidate info not realy used
	 * @param {Object} local		- Local ICE and DTLS properties (optional)
	 * @param {ICEInfo} local.ice		- Local ICE info, containing the username and password. Local ICE candidates list is not really used at all.
	 * @param {DTLSInfo} local.dtls		- Local DTLS info
	 * @param {Array.CandidateInfo} local.candidates - Local candidate info
	 * @returns {Transport}	New transport object
	 */
	createTransport(remote, local, options)
	{
		//Ensure that we have the correct params
		if (!remote || !remote.ice || !remote.dtls)
			//Error
			throw new Error("No remote ICE or DTLS info provided");
		
		//Create native tranport and return wrapper
		const transport = new Transport(this.bundle,
			{
				ice	: remote.ice.clone(),
				dtls	: remote.dtls.clone(),
				//TODO: should clone also
				candidates : remote.candidates || []
			},
			{
				ice	: local && local.ice		? local.ice.clone()	: ICEInfo.generate(),
				dtls	: local && local.dtls		? remote.dtls.clone()	: new DTLSInfo(Setup.reverse(remote.dtls.getSetup),"sha-256",this.fingerprint),
				//TODO: should clone also
				candidates : local && local.candidates	? local.candidates	: [this.candidate]
			},
			Object.assign({
				 disableSTUNKeepAlive : false
			}, options)
		);
		
		//Store it
		this.transports.add(transport);
		
		//Add us to ended
		transport.on("stopped", (transport) => {
			//Remove transport from set
			this.transports.delete(transport);
		});
		
		//Done
		return transport;
	}
	/**
	 * Get local ICE candidates for this endpoint. It will be shared by all the transport associated to this endpoint.
	 * @returns {Array.CandidateInfo}
	 */
	getLocalCandidates() 
	{
		//Return local host candiadate as array
		return [this.candidate];
	}
	
	
	/**
	 * Get local DTLS fingerprint for this endpoint. It will be shared by all the transport associated to this endpoint.
	 * @returns {String}
	 */
	getDTLSFingerprint()
	{
		return this.fingerprint;
	}
	
	/**
	 * Stop the endpoint UDP server and terminate any associated transport
	 */
	stop()
	{
		//Don't call it twice
		if (!this.bundle) return;
		
		//For each transport
		for (let transport of this.transports)
			//Stop it
			transport.stop();
		
		//End bundle
		this.bundle.End();
		
		//Remove bundle reference, so destructor is called on GC
		this.bundle = null;
	}
}

module.exports = Endpoint;
