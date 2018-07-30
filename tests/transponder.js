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
			test.plan(5);
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
			test.same(transponder.getIncommingTrack(),incomingVideoTrack);
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
				//Check new track is attached
				test.same(transponder.getIncommingTrack(),incomingVideoTrack2);
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



tap.test("Transponder::targetbitrate",async function(suite){
	
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
	
	//Create new local stream
	const outgoingStream  = transportA.createOutgoingStream({
		video: true
	});
	//Set the info into B so it can receive it
	const incomingStream = transportB.createIncomingStream(outgoingStream.getStreamInfo());
	//Get video track
	const outgoingVideoTrack = outgoingStream.getVideoTracks()[0];
	const incomingVideoTrack = incomingStream.getVideoTracks()[0];
	//Get transponders
	const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack);
	
	//Modify incoming track stats for SVC like stuff
	
	incomingVideoTrack.getStats = () => ({
			"" : {
				bitrate : 1250000,
				media	: {
					layers  : [
						{temporalLayerId: 0, spatialLayerId: 0, bitrate: 89000},
						{temporalLayerId: 0, spatialLayerId: 1, bitrate: 268000},
						{temporalLayerId: 0, spatialLayerId: 2, bitrate: 625000},
						{temporalLayerId: 1, spatialLayerId: 0, bitrate: 134000},
						{temporalLayerId: 1, spatialLayerId: 1, bitrate: 402000},
						{temporalLayerId: 1, spatialLayerId: 2, bitrate: 938000},
						{temporalLayerId: 2, spatialLayerId: 0, bitrate: 179000},
						{temporalLayerId: 2, spatialLayerId: 1, bitrate: 536000},
						{temporalLayerId: 2, spatialLayerId: 2, bitrate: 1250000}
					]
				}
			}
	});

	
	await suite.test("top",async function(test){
		try {
			//Target bitrate
			const target = 1250000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is created
			test.same(bitrate,target);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	
	await suite.test("default",async function(test){
		try {
			//Target bitrate
			const target = 1240000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is created
			test.ok(bitrate<target);
			test.same(transponder.getSelectedSpatialLayerId() ,2);
			test.same(transponder.getSelectedTemporalLayerId(),1);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	//Create new remote stream
	await suite.test("strict",async function(test){
		try {
			test.plan(2);
			//Target bitrate
			const target = 80000;
			//This should mute
			transponder.once("muted",(muted)=>{
				//OK
				test.ok(muted);
			});
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{strict:true});
			//Check it is created
			test.ok(bitrate==0);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	
	await suite.test("min+unmute",async function(test){
		try {
			test.plan(4);
			//Target bitrate
			const target = 80000;
			//This should unmute
			transponder.once("muted",(muted)=>{
				//OK
				test.ok(!muted);
			});
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is created
			test.ok(bitrate>target);
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),0);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	await suite.test("spatial-temporal",async function(test){
		try {
			//Target bitrate
			const target = 700000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"spatial-temporal"});
			//Check it is created
			test.same(transponder.getSelectedSpatialLayerId() ,2);
			test.same(transponder.getSelectedTemporalLayerId(),0);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	await suite.test("zig-zag-spatial-temporal",async function(test){
		try {
			//Target bitrate
			const target = 700000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"zig-zag-spatial-temporal"});
			//Check it is created
			test.same(transponder.getSelectedSpatialLayerId() ,1);
			test.same(transponder.getSelectedTemporalLayerId(),2);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	await suite.test("temporal-spatial",async function(test){
		try {
			//Target bitrate
			const target = 500000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"temporal-spatial"});
			//Check it is created
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),2);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	await suite.test("zig-zag-temporal-spatial",async function(test){
		try {
			//Target bitrate
			const target = 500000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"zig-zag-temporal-spatial"});
			//Check it is created
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),2);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	await suite.test("limit",async function(test){
		try {
			//Target bitrate
			const target = 700000;
			//Limit max layers
			transponder.setMaximumLayers(0,1);
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"spatial-temporal"});
			//Check it is created
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),1);
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
	});
	
	suite.end();
});

MediaServer.terminate ();