const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);


const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;
const Direction		= SemanticSDP.Direction;
const SourceGroupInfo   = SemanticSDP.SourceGroupInfo;
const CodecInfo		= SemanticSDP.CodecInfo;
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const Capabilities = {
	audio : {
		codecs		: ["opus"],
	},
	video : {
		codecs		: ["vp8","h264"],
		rtx		: true,
		rtcpfbs		: [
			{ "id": "goog-remb"},
			{ "id": "transport-cc"},
			{ "id": "ccm", "params": ["fir"]},
			{ "id": "nack"},
			{ "id": "nack", "params": ["pli"]}
			
		],
		extensions	: [
			"urn:3gpp:video-orientation",
			"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
			"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
			"urn:ietf:params:rtp-hdrext:toffse",
			"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
			"urn:ietf:params:rtp-hdrext:sdes:mid",
		],
		simulcast	: true
	}
};
Promise.all([
tap.test("unified",async function(suite){
	
	await suite.test("create",async function(test){
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Create new incoming stream
		const sdpManager = endpoint.createSDPManager("unified-plan",Capabilities)
		test.ok(sdpManager);
		test.same("initial",sdpManager.getState());
		test.ok(!sdpManager.getTransport());
	});
	
	await suite.test("offer+answer",async function(test){
		test.plan(9);
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("unified-plan",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("unified-plan",Capabilities)
		//Listen for transport events
		sdpManagerA.once("transport",transportA => {
			test.same(transportA,sdpManagerA.getTransport());
			test.ok(transportA);
		});
		sdpManagerB.once("transport",transportB => {
			test.same(transportB,sdpManagerB.getTransport());
			test.ok(transportB);
		});
		//Get offer
		const offer = sdpManagerA.createLocalDescription();
		//Check
		test.ok(offer);
		test.same("local-offer",sdpManagerA.getState());
		//Set offer
		sdpManagerB.processRemoteDescription(offer);
		//Check
		test.same("remote-offer",sdpManagerB.getState());
		//Get answer
		const answer = sdpManagerB.createLocalDescription();
		//Check
		test.same("stable",sdpManagerB.getState());
		//Set answer
		sdpManagerA.processRemoteDescription(answer);
		//Check
		test.same("stable",sdpManagerA.getState());
	});
	
	await suite.test("negotitionneeded",async function(test){
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("unified-plan",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("unified-plan",Capabilities)
		//Listen for renegotiation events
		sdpManagerA.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			//Set answer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			test.done();
		});
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		//Add track
		sdpManagerA.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
	});
	
	await suite.test("negotitionneeded reversed",async function(test){
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("unified-plan",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("unified-plan",Capabilities)
		//Listen for renegotiation events
		sdpManagerB.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			//Set answer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			test.done();
		});
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		//Add track
		sdpManagerB.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
	});
	
	await suite.test("negotitionneeded pending",async function(test){
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("unified-plan",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("unified-plan",Capabilities)
		//Listen for renegotiation events
		sdpManagerB.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			//Set answer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			test.done();
		});
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Add track
		sdpManagerB.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		
	});
	
	await suite.test("negotitionneeded removed",async function(test){
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("unified-plan",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("unified-plan",Capabilities)
		
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		
		//Add track
		const stream = sdpManagerB.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
		
		//Listen for renegotiation events
		sdpManagerB.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			//Set answer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			//Stop endpoint
			sdpManagerA.stop();
			sdpManagerB.stop();
			endpointA.stop();
			endpointB.stop();
			//OK
			test.end();
		});
		
		//Set offer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		//Set answer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Stop stream
		stream.stop();
		
		await sleep(1000);
	});
	
	suite.end();
}),

tap.test("planb",async function(suite){
	
	await suite.test("create",async function(test){
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Create new incoming stream
		const sdpManager = endpoint.createSDPManager("plan-b",Capabilities)
		test.ok(sdpManager);
		test.same("initial",sdpManager.getState());
		test.ok(!sdpManager.getTransport());
	});
	
	await suite.test("offer+answer",async function(test){
		test.plan(9);
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("plan-b",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("plan-b",Capabilities)
		//Listen for transport events
		sdpManagerA.once("transport",transportA => {
			test.same(transportA,sdpManagerA.getTransport());
			test.ok(transportA);
		});
		sdpManagerB.once("transport",transportB => {
			test.same(transportB,sdpManagerB.getTransport());
			test.ok(transportB);
		});
		//Get offer
		const offer = sdpManagerA.createLocalDescription();
		//Check
		test.ok(offer);
		test.same("local-offer",sdpManagerA.getState());
		//Set offer
		sdpManagerB.processRemoteDescription(offer);
		//Check
		test.same("remote-offer",sdpManagerB.getState());
		//Get answer
		const answer = sdpManagerB.createLocalDescription();
		//Check
		test.same("stable",sdpManagerB.getState());
		//Set answer
		sdpManagerA.processRemoteDescription(answer);
		//Check
		test.same("stable",sdpManagerA.getState());
	});
	
	await suite.test("negotitionneeded",async function(test){
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("plan-b",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("plan-b",Capabilities)
		//Listen for renegotiation events
		sdpManagerA.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			//Set answer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			test.done();
		});
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		//Add track
		sdpManagerA.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
	});
	
	await suite.test("negotitionneeded reversed",async function(test){
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("plan-b",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("plan-b",Capabilities)
		//Listen for renegotiation events
		sdpManagerB.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			//Set answer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			test.done();
		});
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		//Add track
		sdpManagerB.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
	});
	
	await suite.test("negotitionneeded removed",async function(test){
		
		const endpointA = MediaServer.createEndpoint("127.0.0.1");
		const endpointB = MediaServer.createEndpoint("127.0.0.1");
		//Create two managers
		const sdpManagerA = endpointA.createSDPManager("plan-b",Capabilities)
		const sdpManagerB = endpointB.createSDPManager("plan-b",Capabilities)
		
		//Set offer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Set answer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		
		//Add track
		const stream = sdpManagerB.getTransport().createOutgoingStream({
			audio: true,
			video: true
		});
		
		//Listen for renegotiation events
		sdpManagerB.once("renegotiationneeded", () => {
			//Set offer
			sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
			//Set answer
			sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
			//Stop endpoint
			sdpManagerA.stop();
			sdpManagerB.stop();
			endpointA.stop();
			endpointB.stop();
			//OK
			test.end();
		});
		
		//Set offer
		sdpManagerA.processRemoteDescription(sdpManagerB.createLocalDescription());
		//Set answer
		sdpManagerB.processRemoteDescription(sdpManagerA.createLocalDescription());
		//Stop stream
		stream.stop();
		
		await sleep(1000);
	});
	
	suite.end();
})
]).then(()=>MediaServer.terminate ());

