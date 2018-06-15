const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;
const CodecInfo		= SemanticSDP.CodecInfo;

MediaServer.enableLog(false);

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

tap.test("Transponder::create",async function(suite){
	
	//Create UDP server endpoint
	let endpointA = MediaServer.createEndpoint("127.0.0.1");
	let endpointB = MediaServer.createEndpoint("127.0.0.1");

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

	//Create new remote stream
	await suite.test("attach",async function(test){
		try {
			test.plan(4);
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				video: true
			});
			//test outgoing stream creation
			test.ok(outgoingStream);
			//Set the info into B so it can receive it
			const incomingStream = transportB.createIncomingStream(outgoingStream.getStreamInfo());
			//test outgoing stream creation
			test.ok(incomingStream);
			//Get video track
			const outgoingVideoTrack = outgoingStream.getVideoTracks()[0];
			const incomingVideoTrack = incomingStream.getVideoTracks()[0];
			//Listen for attach
			incomingVideoTrack.once("attached",()=>{
				//OK
				test.pass();
			});
			//Get transponders
			const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack);
			//Check it is created
			test.ok(transponder);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	//Create new remote stream
	await suite.test("detach",async function(test){
		try {
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				video: true
			});
			//test outgoing stream creation
			test.ok(outgoingStream);
			//Set the info into B so it can receive it
			const incomingStream = transportB.createIncomingStream(outgoingStream.getStreamInfo());
			//test outgoing stream creation
			test.ok(incomingStream);
			//Get video track
			const outgoingVideoTrack = outgoingStream.getVideoTracks()[0];
			const incomingVideoTrack = incomingStream.getVideoTracks()[0]
			//Listen for attach
			incomingVideoTrack.once("detached",()=>{
				//OK
				test.pass();
			});
			//Get transponders
			const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack);
			//Check it is created
			test.ok(transponder);
			//Listen for transponder stop
			transponder.once("stopped",()=>{
				//OK
				test.pass();
			});
			//Stop
			transponder.stop();
			//Ok
			test.pass();
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	await suite.test("multi attach+detach",async function(test){
		try {
			test.plan(3);
			let transponder2;
			//Create new local stream
			const outgoingStream1  = transportA.createOutgoingStream({
				video: true
			});
			//Create new local stream
			const outgoingStream2  = transportA.createOutgoingStream({
				video: true
			});
			//Set the info into B so it can receive it
			const incomingStream = transportB.createIncomingStream(outgoingStream1.getStreamInfo());
			//Get video track
			const outgoingVideoTrack1 = outgoingStream1.getVideoTracks()[0];
			const outgoingVideoTrack2 = outgoingStream2.getVideoTracks()[0];
			const incomingVideoTrack  = incomingStream.getVideoTracks()[0];
			
			//Listen for attach
			incomingVideoTrack.on("attached",()=>{
				//should only fire one
				test.pass();
				//Sould fire on first attach
				transponder2 = outgoingVideoTrack2.attachTo(incomingVideoTrack);
				
			});
			//Listen for detached
			incomingVideoTrack.on("detached",()=>{
				//should only fire one
				test.pass();
			});
			//Get transponders
			const transponder1 = outgoingVideoTrack1.attachTo(incomingVideoTrack);
			//Listen for transponder stop
			transponder1.once("stopped",()=>{
				//OK
				test.pass();
				//Stop second transponder
				transponder2.stop();
			});
			//Stop
			transponder1.stop();
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	
	//Create new remote stream
	await suite.test("replace track",async function(test){
		try {
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				video: true
			});
			//test outgoing stream creation
			test.ok(outgoingStream);
			//Set the info into B so it can receive it
			const incomingStream1 = transportB.createIncomingStream(outgoingStream.getStreamInfo());
			const incomingStream2 = transportA.createIncomingStream(outgoingStream.getStreamInfo());
			//Get video track
			const outgoingVideoTrack = outgoingStream.getVideoTracks()[0];
			const incomingVideoTrack1 = incomingStream1.getVideoTracks()[0];
			const incomingVideoTrack2 = incomingStream2.getVideoTracks()[0];
			//Listen for attach on second stream
			incomingVideoTrack2.on("attached",()=>{
				//OK
				test.end();
			});
			//Listen for dettach on first one
			incomingVideoTrack1.on("detached",()=>{
				//OK
				test.pass();
			});
			//Get transponders
			const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack1);
			//Replace track
			transponder.setIncomingTrack(incomingVideoTrack2);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	suite.test("mute",function(test){
		try {
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				video: true
			});
			const incomingStream = transportB.createIncomingStream(outgoingStream.getStreamInfo());
			//Get transponders
			const transponder = outgoingStream.getVideoTracks()[0].attachTo(incomingStream.getVideoTracks()[0]);
			//Check event
			transponder.once("muted",(muted)=>{
				test.ok(muted);
			});
			//Mute
			transponder.mute(true);
			//Check transponder is muted
			test.ok(transponder.isMuted());
			//Check streams and tracks are not muted
			test.ok(!outgoingStream.isMuted());
			test.ok(!outgoingStream.getVideoTracks()[0].isMuted());
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.end();
});

MediaServer.terminate ();