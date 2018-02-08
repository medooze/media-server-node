//Server IP address
const ip = "127.0.0.1";


const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CodecInfo		= SemanticSDP.CodecInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;

//Get the Medooze Media Server interface
const MediaServer = require("../index");

//Enable debug
//MediaServer.enableDebug(true);
//MediaServer.enableUltraDebug(true);

const player = MediaServer.createPlayer("/tmp/recording.mp4");

//Create RTP properties
const rtp = {
	audio :  new MediaInfo("audio","audio"),
	video :  new MediaInfo("video","video")
};

//Add rtp codec info data
const opus = new CodecInfo("opus",96);
const vp8 = new CodecInfo("vp8",97);
vp8.setRTX(98);
//Add codecs
rtp.audio.addCodec(opus);	
rtp.video.addCodec(vp8);

var runs = [];

for (let i=0;i<400;++i)
{
	//Create UDP server endpoint
	let endpointA = MediaServer.createEndpoint(ip);
	let endpointB = MediaServer.createEndpoint(ip);

	const A = {
		ice	   :  ICEInfo.generate(),
		dtls	   :  new DTLSInfo(Setup.ACTIVE, "sha-256",endpointA.getDTLSFingerprint())
	};

	const B = {
		ice	   :  ICEInfo.generate(),
		dtls	   :  new DTLSInfo(Setup.PASSIVE, "sha-256",endpointB.getDTLSFingerprint()),
	};

	//Create an DTLS ICE transport in that enpoint
	let transportA = endpointA.createTransport(B, A, {disableSTUNKeepAlive: true});
	let transportB = endpointB.createTransport(A, B, {disableSTUNKeepAlive: true});

	//Set local&remote properties
	transportA.setLocalProperties(rtp);
	transportA.setRemoteProperties(rtp);
	transportB.setLocalProperties(rtp);
	transportB.setRemoteProperties(rtp);

	//Add remote candidates
	transportA.addRemoteCandidates(transportB.getLocalCandidates());
	transportB.addRemoteCandidates(transportA.getLocalCandidates());

	//Publish player stream into tranport A, it will send it over the local loopback to B
	const outgoingStream = transportA.publish(player);

	console.dir(outgoingStream.getStreamInfo().plain());

	//Set the info into B so it can receive it
	transportB.createIncomingStream(outgoingStream.getStreamInfo());
	
	//Push it
	runs.push([endpointA,endpointB,transportA,transportB]);
}

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
	
},120000);

