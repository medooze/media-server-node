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

/**
 * An endpoint represent an UDP server socket.
 * The endpoint will process STUN requests in order to be able to associate the remote ip:port with the registered transport and forward any further data comming from that transport.
 * Being a server it is ICE-lite.
 */
class Endpoint 
{
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
	}
	
	/**
	 * Create a new transport object and register it with the remote ICE username and password
	 * @param {Object} remote	- Remote ICE and DTLS properties
	 * @param {Object} remote.ice	- Remote ICE info, containing the username and password. Remote ICE candidates list is not really used at all.
	 * @param {Object} remote.dtls	- Remote DTLS info
	 * @returns {Transport}	New transport object
	 */
	createTransport(remote)
	{
		//Ensure that we have the correct params
		if (!remote.ice || !remote.dtls)
			//Error
			throw new Error("No remote ICE or DTLS info provided");
		
		//Create native tranport and return wrapper
		const transport = new Transport(this.bundle,remote);
		
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
	 * Get local ICE candidate for this endpoint. It will be shared by all the transport associated to this endpoint.
	 * @returns {CandidateInfo}
	 */
	getLocalCandidate() 
	{
		//Return local host candiadate
		return this.candidate;
	}
	
	/**
	 * Stop the endpoint UDP server and terminate any associated transport
	 */
	stop()
	{
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
