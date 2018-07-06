const Native		= require("./Native");
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
		this.bundle = new Native.RTPBundleTransport();
		//Start it
		this.bundle.Init();
		//Store all transports
		this.transports = new Set();
		//Create candidate
		this.candidate = new CandidateInfo("1", 1, "UDP", 33554431, ip, this.bundle.GetLocalPort(), "host");
		//Get fingerprint (global at media server level currently)
		this.fingerprint = Native.MediaServer.GetFingerprint().toString();
	}
	
	/**
	 * Create a new transport object and register it with the remote ICE username and password
	 * @param {Object|SDPInfo}  remoteInfo	- Remote ICE and DTLS properties
	 * @param {Object|ICEInfo}  remote.ice	- Remote ICE info, containing the username and password.
	 * @param {Object|DTLSInfo} remote.dtls	- Remote DTLS info
	 * @param {Array.CandidateInfo|Array.Object} remote.candidates - Remote ICE candidate info
	 * @param {Object}   localInfo		- Local ICE and DTLS properties (optional)
	 * @param {ICEInfo}  local.ice		- Local ICE info, containing the username and password. Local ICE candidates list is not really used at all.
	 * @param {DTLSInfo} local.dtls		- Local DTLS info
	 * @param {Array.CandidateInfo} local.candidates - Local candidate info
	 * @param {Object} options		- Dictionary with transport properties
	 * @param {boolean} options.disableSTUNKeepAlive - Disable ICE/STUN keep alives, required for server to server transports
	 * @param {String} options.srtpProtectionProfiles - Colon delimited list of SRTP protection profile names
	 * @returns {Transport}	New transport object
	 */
	createTransport(remoteInfo, localInfo, options)
	{
		//Support both plain js object and SDPInfo
		if (remoteInfo.constructor.name === "SDPInfo")
			//Convert
			remoteInfo = {
				dtls		: remoteInfo.getDTLS(),
				ice		: remoteInfo.getICE(),
				candidates	: remoteInfo.getCandidates()
			};
		
		//Ensure that we have the correct params
		if (!remoteInfo || !remoteInfo.ice || !remoteInfo.dtls)
			//Error
			throw new Error("No remote ICE or DTLS info provided");
		
		//Create remote properites
		const remote = {
			dtls		: remoteInfo.dtls.constructor.name === "DTLSInfo" ? remoteInfo.dtls.clone() : DTLSInfo.expand(remoteInfo.dtls),
			ice		: remoteInfo.ice .constructor.name === "ICEInfo"  ? remoteInfo.ice.clone()  : ICEInfo.expand(remoteInfo.ice),
			candidates	: []
		};
		
		//Add all remote candidates
		for (let i=0;remoteInfo.candidates && i<remoteInfo.candidates.length; ++i)
			//Clone
			remote.candidates.push(remoteInfo.candidates[i].constructor.name === "CandidateInfo"? remoteInfo.candidates[i].clone() : CandidateInfo.expand(remoteInfo.candidates[i]));

		//If there is no local info
		if (!localInfo)
		{
			//Generate one
			localInfo = {
				ice		: ICEInfo.generate(true),
				dtls		: new DTLSInfo(Setup.reverse(remoteInfo.dtls.getSetup()),"sha-256",this.fingerprint),
				candidates	: [this.candidate]
			};
		//If it is an SDPInfo object
		} else if (localInfo.constructor.name === "SDPInfo") {
			//Convert
			localInfo = {
				dtls		: localInfo.getDTLS(),
				ice		: localInfo.getICE(),
				candidates	: localInfo.getCandidates()
			};
		} 
		
		
		//Create local properites
		const local = {
			dtls		: localInfo.dtls.constructor.name === "DTLSInfo" ? localInfo.dtls.clone() : DTLSInfo.expand(localInfo.dtls),
			ice		: localInfo.ice.constructor.name === "ICEInfo"  ? localInfo.ice.clone()  : ICEInfo.expand(localInfo.ice),
			candidates	: []
		};
		
		//Add all local candidates
		for (let i=0;localInfo.candidates && i<localInfo.candidates.length; ++i)
			//Clone
			local.candidates.push(localInfo.candidates[i].constructor.name === "CandidateInfo" ? localInfo.candidates[i].clone() : CandidateInfo.expand(localInfo.candidates[i]));

		//Create native tranport and return wrapper
		const transport = new Transport(this.bundle,remote, local, Object.assign({
				 disableSTUNKeepAlive : false,
				 srtpProtectionProfiles : ""
			}, options)
		);
		
		//Store it
		this.transports.add(transport);
		
		//Add us to ended
		transport.once("stopped", (transport) => {
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
	 * Helper that creates an offer from capabilities
	 * It generates a random ICE username and password and gets endpoint fingerprint
	 * @param {Object} capabilities - Media capabilities as required by SDPInfo.create
	 * @returns {SDPInfo} - SDP offer
	 */
	createOffer(capabilities)
	{
		//Create offer
		return SDPInfo.create({
			dtls		: new DTLSInfo(Setup.ACTPASS,"sha-256",this.fingerprint),
			ice		: ICEInfo.generate(true),
			candidates	: this.getLocalCandidates(),
			capabilities	: capabilities
		});
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
