//Server IP address
const ip = "127.0.0.1";


const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;


//Get the Medooze Media Server interface
const MediaServer = require("../index");

//Enable debug
MediaServer.enableDebug(true);
//MediaServer.enableUltraDebug(true);


//Create UDP server endpoint
let endpointA = MediaServer.createEndpoint(ip);
let endpointB = MediaServer.createEndpoint(ip);

var A = {
	ice	   :  ICEInfo.generate(),
	dtls	   :  new DTLSInfo(Setup.ACTIVE, "sha-256",endpointA.getDTLSFingerprint())
};

var B = {
	ice	   :  ICEInfo.generate(),
	dtls	   :  new DTLSInfo(Setup.PASSIVE, "sha-256",endpointB.getDTLSFingerprint()),
};

//Create an DTLS ICE transport in that enpoint
let transportA = endpointA.createTransport(B, A, {disableSTUNKeepAlive: true});
let transportB = endpointB.createTransport(A, B, {disableSTUNKeepAlive: true});

//Add remote candidates
transportA.addRemoteCandidates(transportB.getLocalCandidates());
transportB.addRemoteCandidates(transportA.getLocalCandidates());


var player = MediaServer.createPlayer("/tmp/recording.mp4");

var video = player.getVideoTracks()[0];


player.play();

//Terminate in 10s
setTimeout(()=> {
	//Terminate transport
	transportA.stop();
	transportB.stop();

	//Terminate enpoint and close sockets
	endpointA.stop();
	endpointB.stop();
	
	endpointA = null;
	endpointB = null;
	
	global.gc && global.gc();
	process.exit(0);
	
},10000);

