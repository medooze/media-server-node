const tap		= require("tap");
const MediaServer	= require("../index");
const LayerInfo		= require("../lib/LayerInfo");
const SemanticSDP	= require("semantic-sdp");

const {
	SDPInfo,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
	TrackEncodingInfo,
	Setup,
	CodecInfo,
} = require("semantic-sdp");



MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);

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

Promise.all([

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
			//Check it is correctly selected
			test.ok(transponder);
			test.same(transponder.getIncomingTrack(),incomingVideoTrack);
		} catch (error) {
			console.error(error)
			//Test error
			test.notOk(error,error.message);
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
			//Check it is correctly selected
			test.ok(transponder);
			//Test it is attached
			test.ok(incomingVideoTrack.isAttached());
			//Listen for transponder stop
			transponder.once("stopped",()=>{
				//OK
				test.pass();
			});
			//Stop
			transponder.stop();
			//Test it is not attached
			test.notOk(incomingVideoTrack.isAttached());
			//Ok
			test.pass();
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
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
			test.notOk(error,error.message);
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
				test.same(transponder.getIncomingTrack(),incomingVideoTrack2);
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
			test.notOk(error,error.message);
		}
	});

	//Create new remote stream
	await suite.test("stream attach dettach",async function(test){
		try {
			test.plan(8)
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				audio: true,
				video: true
			});
			//test outgoing stream creation
			test.ok(outgoingStream);
			//Set the info into B so it can receive it
			const incomingStream = transportB.createIncomingStream(outgoingStream.getStreamInfo());
			//test outgoing stream creation
			test.ok(incomingStream);

			//Listen for attach
			incomingStream.on("attached",()=>{
				//OK
				test.pass();
			});
			//Listen for attach
			incomingStream.on("detached",()=>{
				//OK
				test.pass();
			});
			//Get transponders
			const transponders = outgoingStream.attachTo(incomingStream);
			//Check it is correctly selected
			test.ok(transponders);
			//Test it is attached
			test.ok(incomingStream.isAttached());
			//Stop
			transponders[0].stop();
			transponders[1].stop();
			//Ok
			test.pass();
			//Test it is not attached
			test.notOk(incomingStream.isAttached());
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
		test.end();
	});

	//Create new remote stream
	await suite.test("stream track detach",async function(test){
		try {
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				audio: true,
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
			incomingStream.once("detached",()=>{
				//OK
				test.pass();
			});
			//Get transponders
			const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack);
			//Check it is correctly selected
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
			test.notOk(error,error.message);
		}
		test.end();
	});

	//Create new remote stream
	await suite.test("stream audio video attach",async function(test){
		try {
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				audio: true,
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
			const outgoingAudioTrack = outgoingStream.getAudioTracks()[0];
			const incomingVideoTrack = incomingStream.getVideoTracks()[0];
			const incomingAudioTrack = incomingStream.getAudioTracks()[0]
			//Listen for attach
			incomingStream.once("attached",()=>{
				//OK
				test.pass();

				//Listen for attach
				incomingStream.once("attached",()=>{
					//Only a single event
					test.fail(true);
				});

				//Get transponders
				const transponder = outgoingAudioTrack.attachTo(incomingAudioTrack);
			});
			
			//Get transponders
			const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack);
			//Check it is correctly selected
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
			test.notOk(error,error.message);
		}
		test.end();
	});

	await suite.test("stream multi attach+detach",async function(test){
		try {
			test.plan(3);
			let transponder2;
			//Create new local stream
			const outgoingStream1  = transportA.createOutgoingStream({
				audio: true,
				video: true
			});
			//Create new local stream
			const outgoingStream2  = transportA.createOutgoingStream({
				audio: true,
				video: true
			});
			//Set the info into B so it can receive it
			const incomingStream = transportB.createIncomingStream(outgoingStream1.getStreamInfo());
			//Get video track
			const outgoingVideoTrack1 = outgoingStream1.getVideoTracks()[0];
			const outgoingVideoTrack2 = outgoingStream2.getVideoTracks()[0];
			const incomingVideoTrack  = incomingStream.getVideoTracks()[0];
			
			//incomingStream for attach
			incomingStream.on("attached",()=>{
				//should only fire one
				test.pass();
				//Sould fire on first attach
				transponder2 = outgoingVideoTrack2.attachTo(incomingVideoTrack);
				
			});
			//Listen for detached
			incomingStream.on("detached",()=>{
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
			test.notOk(error,error.message);
		}
	});

	
	//Create new remote stream
	await suite.test("stream - replace track",async function(test){
		try {
			//Create new local stream
			const outgoingStream  = transportA.createOutgoingStream({
				audio: true,
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
			incomingStream2.on("attached",()=>{
				//Check new track is attached
				test.same(transponder.getIncomingTrack(),incomingVideoTrack2);
				//OK
				test.end();
			});
			//Listen for dettach on first one
			incomingStream1.on("detached",()=>{
				//OK
				test.pass();
			});
			//Get transponders
			const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack1);
			//Replace track
			transponder.setIncomingTrack(incomingVideoTrack2);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
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
			test.notOk(error,error.message);
		}
		test.end();
	});
	
	suite.end();
}),

tap.test("Transponder::targetbitrate svc",async function(suite){
	
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
						{temporalLayerId: 0, spatialLayerId: 0, bitrate: 89000,   targetWidth: 240, targetHeight: 240},
						{temporalLayerId: 0, spatialLayerId: 1, bitrate: 268000,  targetWidth: 360, targetHeight: 360},
						{temporalLayerId: 0, spatialLayerId: 2, bitrate: 625000,  targetWidth: 480, targetHeight: 480},
						{temporalLayerId: 1, spatialLayerId: 0, bitrate: 134000,  targetWidth: 240, targetHeight: 240},
						{temporalLayerId: 1, spatialLayerId: 1, bitrate: 402000,  targetWidth: 360, targetHeight: 360},
						{temporalLayerId: 1, spatialLayerId: 2, bitrate: 938000,  targetWidth: 480, targetHeight: 480},
						{temporalLayerId: 2, spatialLayerId: 0, bitrate: 179000,  targetWidth: 240, targetHeight: 240},
						{temporalLayerId: 2, spatialLayerId: 1, bitrate: 536000,  targetWidth: 360, targetHeight: 360},
						{temporalLayerId: 2, spatialLayerId: 2, bitrate: 1250000, targetWidth: 480, targetHeight: 480},
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
			//Check it is correctly selected
			test.ok(bitrate == target);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	
	await suite.test("default",async function(test){
		try {
			//Target bitrate
			const target = 1240000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is correctly selected
			test.ok(bitrate<target);
			test.same(transponder.getSelectedSpatialLayerId() ,2);
			test.same(transponder.getSelectedTemporalLayerId(),1);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
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
			//Check it is correctly selected
			test.ok(bitrate==0);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
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
			//Check it is correctly selected
			test.ok(bitrate>target);
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),0);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	await suite.test("spatial-temporal",async function(test){
		try {
			//Target bitrate
			const target = 700000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"spatial-temporal"});
			//Check it is correctly selected
			test.same(transponder.getSelectedSpatialLayerId() ,2);
			test.same(transponder.getSelectedTemporalLayerId(),0);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	await suite.test("zig-zag-spatial-temporal",async function(test){
		try {
			//Target bitrate
			const target = 700000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"zig-zag-spatial-temporal"});
			//Check it is correctly selected
			test.same(transponder.getSelectedSpatialLayerId() ,1);
			test.same(transponder.getSelectedTemporalLayerId(),2);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	await suite.test("temporal-spatial",async function(test){
		try {
			//Target bitrate
			const target = 500000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"temporal-spatial"});
			//Check it is correctly selected
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),2);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	await suite.test("zig-zag-temporal-spatial",async function(test){
		try {
			//Target bitrate
			const target = 500000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"zig-zag-temporal-spatial"});
			//Check it is correctly selected
			test.same(transponder.getSelectedSpatialLayerId() ,0);
			test.same(transponder.getSelectedTemporalLayerId(),2);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	await suite.test("limit",async function(test){
		try {
			const maxSpatialLayerId = 0;
			const maxTemporalLayerId = 1;
			//Target bitrate
			const target = 700000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target,{traversal:"spatial-temporal"});
			//Check layers returned and selected layers
			test.same(bitrate.layers.length,9);
			test.notOk(bitrate.layers
				.map(layer=>maxSpatialLayerId>=layer.spatialLayerId && maxTemporalLayerId>=layer.temporalLayerId)
				.reduce(( acu, cur ) => acu && cur )
			);
			test.same(transponder.getSelectedSpatialLayerId() ,2);
			test.same(transponder.getSelectedTemporalLayerId(),0);
			//Limit max layers
			transponder.setMaximumLayers(0,1);
			//Set bitrate
			const filtered = transponder.setTargetBitrate(target,{traversal:"spatial-temporal"});
			//Check layers returned and selected layers
			test.same(filtered.layers.length,2);
			test.ok(filtered.layers
				.map(layer=>maxSpatialLayerId>=layer.spatialLayerId && maxTemporalLayerId>=layer.temporalLayerId)
				.reduce(( acu, cur ) => acu && cur )
			);
			test.same(transponder.getSelectedSpatialLayerId() ,maxSpatialLayerId);
			test.same(transponder.getSelectedTemporalLayerId(),maxTemporalLayerId);
			//Unset maximum so next tests can reuse sane transponder
			transponder.setMaximumLayers(LayerInfo.MaxLayerId,LayerInfo.MaxLayerId);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	await suite.test("setMaximumDimensions",async function(test){
		try {
			//Set max dimensions
			transponder.setMaximumDimensions(360,360);
			//Target bitrate
			const target = 10000000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check we have given a layer with proper dimensions
			test.ok(bitrate.layer.targetWidth<=360);
			test.ok(bitrate.layer.targetHeight<=360);
			test.same(transponder.getSelectedSpatialLayerId() ,1);
			test.same(transponder.getSelectedTemporalLayerId(),2);
			//Reset dimensions
			transponder.setMaximumDimensions(0,0);

			//Set bitrate without restriction
			transponder.setTargetBitrate(target);
			//Check we choose top layer
			test.same(transponder.getSelectedSpatialLayerId() ,2);
			test.same(transponder.getSelectedTemporalLayerId(),2);

		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	suite.end();
}),

tap.test("Transponder::targetbitrate simulcast",async function(suite){
	
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
	//Get ougoing stream info
	const outgoingStreamInfo = outgoingStream.getStreamInfo();
	//Add simulcast info
	const outgoingVideoTrackInfo = outgoingStreamInfo.getFirstTrack("video");
	outgoingVideoTrackInfo.addEncoding( new TrackEncodingInfo("0"));
	outgoingVideoTrackInfo.addEncoding( new TrackEncodingInfo("1"));
	outgoingVideoTrackInfo.addEncoding( new TrackEncodingInfo("2"));

	//Set the info into B so it can receive it
	const incomingStream = transportB.createIncomingStream(outgoingStreamInfo);
	//Get video track
	const outgoingVideoTrack = outgoingStream.getVideoTracks()[0];
	const incomingVideoTrack = incomingStream.getVideoTracks()[0];
	//Get transponders
	const transponder = outgoingVideoTrack.attachTo(incomingVideoTrack);
	
	//Modify incoming track stats for SVC like stuff
	
	incomingVideoTrack.getStats = () => ({
			"0" : {
				bitrate : 179000,
				media	: {
					width: 240,
					height: 240,
					layers: []
				},
				targetWidth: 240,
				targetHeight: 240
			},
			"1"  : {
				bitrate : 536000,
				media	: {
					width: 360,
					height: 360,
					layers: []
				},
				targetWidth: 360,
				targetHeight: 360
			},
			"2"  : {
				bitrate : 1250000,
				media	: {
					width: 480,
					height: 360,
					layers: []
				},
				targetWidth: 480,
				targetHeight: 480
			},
	});

	
	await suite.test("top",async function(test){
		try {
			//Target bitrate
			const target = 1250000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is correctly selected
			test.ok(bitrate == target);
			test.same(transponder.getSelectedEncoding() ,"2");
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	
	await suite.test("default",async function(test){
		try {
			//Target bitrate
			const target = 1240000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is correctly selected
			test.ok(bitrate<target);
			test.same(transponder.getSelectedEncoding() ,"1");
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
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
			//Check it is correctly selected
			test.ok(bitrate==0);
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	
	await suite.test("min+unmute",async function(test){
		try {
			test.plan(3);
			//Target bitrate
			const target = 80000;
			//This should unmute
			transponder.once("muted",(muted)=>{
				//OK
				test.ok(!muted);
			});
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check it is correctly selected
			test.ok(bitrate>target);
			test.same(transponder.getSelectedEncoding() ,"0");
		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	
	await suite.test("setMaximumDimensions",async function(test){
		try {
			//Set max dimensions
			transponder.setMaximumDimensions(360,360);
			//Target bitrate
			const target = 10000000;
			//Set bitrate
			const bitrate = transponder.setTargetBitrate(target);
			//Check we have given a layer with proper dimensions
			test.same(transponder.getSelectedEncoding() ,"1");
			//Reset dimensions
			transponder.setMaximumDimensions(0,0);

			//Set bitrate without restriction
			transponder.setTargetBitrate(target);
			//Check we choose top layer
			test.same(transponder.getSelectedEncoding() ,"2");

		} catch (error) {
			//Test error
			test.notOk(error,error.message);
		}
	});
	
	suite.end();
})
]).then(()=>MediaServer.terminate ());

