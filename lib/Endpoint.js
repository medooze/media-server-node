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
	
	getLocalCandidate() 
	{
		//Return local host candiadate
		return this.candidate;
	}
	
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
