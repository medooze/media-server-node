const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

const {
	StreamInfo,
	TrackInfo,
	Setup,
	Direction,
	SourceGroupInfo,
	CodecInfo,
	TrackEncodingInfo,
} = require("semantic-sdp");


MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);


const stats1 = {
	bitrate : 1250001,
	media	: {
		layers  : [
			{temporalLayerId: 0, spatialLayerId: 0, bitrate: 89001},
			{temporalLayerId: 0, spatialLayerId: 1, bitrate: 268001},
			{temporalLayerId: 0, spatialLayerId: 2, bitrate: 625001},
			{temporalLayerId: 1, spatialLayerId: 0, bitrate: 134001},
			{temporalLayerId: 1, spatialLayerId: 1, bitrate: 402001},
			{temporalLayerId: 1, spatialLayerId: 2, bitrate: 938001},
			{temporalLayerId: 2, spatialLayerId: 0, bitrate: 179001},
			{temporalLayerId: 2, spatialLayerId: 1, bitrate: 536001},
			{temporalLayerId: 2, spatialLayerId: 2, bitrate: 1250001},
			{temporalLayerId: 0, spatialLayerId: 3, bitrate: 0}
		]
	}
};
const stats2 = {
	bitrate : 1250002,
	media	: {
		layers  : [
			{temporalLayerId: 0, spatialLayerId: 0, bitrate: 89002},
			{temporalLayerId: 0, spatialLayerId: 1, bitrate: 268002},
			{temporalLayerId: 0, spatialLayerId: 2, bitrate: 625002},
			{temporalLayerId: 1, spatialLayerId: 0, bitrate: 134002},
			{temporalLayerId: 1, spatialLayerId: 1, bitrate: 402002},
			{temporalLayerId: 1, spatialLayerId: 2, bitrate: 938002},
			{temporalLayerId: 2, spatialLayerId: 0, bitrate: 179002},
			{temporalLayerId: 2, spatialLayerId: 1, bitrate: 536002},
			{temporalLayerId: 2, spatialLayerId: 2, bitrate: 1250002},
			{temporalLayerId: 0, spatialLayerId: 3, bitrate: 0}
		]
	}
};
const inactive = {
	bitrate : 0,
	media	: {
		layers  : []
	}
};

let ssrc = 1;
	
Promise.all([	
tap.test("IncomingStream",function(suite){
	//Create UDP server endpoints
	const endpoint = MediaServer.createEndpoint("127.0.0.1");
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("create+stop emtpy simulcast adapter",function(test){
		test.plan(2);
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		test.ok(simulcastTrack)
		
		//Listent for stop
		simulcastTrack.on("stopped",(track)=>{
			test.ok(track);
		});
		simulcastTrack.stop();
		//Ok
		test.end();
	});

	suite.test("create+stop simulcast adapter",function(test){
		test.plan(4);
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		test.ok(simulcastTrack)

		//Create new incoming stream
		const incomingStreamTrack = transport.createIncomingStreamTrack("video");
		//Listen for the encoding event
		simulcastTrack.on("encoding", (track,encoding) =>	{
			test.ok(encoding);
		})
		//Add it
		simulcastTrack.addTrack("",incomingStreamTrack);

		//Check number of encodings
		test.same(simulcastTrack.getEncodings().length,1);
		//Listent for stop
		simulcastTrack.on("stopped",(track)=>{
			test.ok(track);
		});
		simulcastTrack.stop();
		//Ok
		test.end();
	});


	suite.test("stop track",function(test){
		test.plan(5);
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		test.ok(simulcastTrack)

		//Create new incoming stream
		const incomingStreamTrack1 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack2 = transport.createIncomingStreamTrack("video");

		//Listen for the encoding event
		simulcastTrack.on("encoding", (track,encoding) =>	{
			test.ok(encoding);
		})
		//Add it
		simulcastTrack.addTrack("1",incomingStreamTrack1);
		simulcastTrack.addTrack("2",incomingStreamTrack2);

		//Check number of encodings
		test.same(simulcastTrack.getEncodings().length,2);

		//Listent for stop
		simulcastTrack.on("stopped",(track)=>{
			test.ok(track);
		});
		incomingStreamTrack1.stop();
		simulcastTrack.stop();
		//Ok
		test.end();
	});


	suite.test("getStats",function(test){
		test.plan(9);
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");

		//Create new incoming stream
		const incomingStreamTrack1 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack2 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack3 = transport.createIncomingStreamTrack("video");

		//Listen for the encoding event
		simulcastTrack.on("encoding", (track,encoding) =>	{
			test.ok(encoding);
		})

		//Add them
		simulcastTrack.addTrack("1",incomingStreamTrack1);
		simulcastTrack.addTrack("2",incomingStreamTrack2);
		simulcastTrack.addTrack("3",incomingStreamTrack3);

		//Fake the stats
		incomingStreamTrack1.getStats = () => ({"" : stats1});
		incomingStreamTrack3.getStats = () => ({"" : stats2});

		//Check number of encodings
		test.same(simulcastTrack.getEncodings().length,3);

		//Remove one
		incomingStreamTrack2.stop();


		//Check number of encodings
		test.same(simulcastTrack.getEncodings().length,2);

		const stats = simulcastTrack.getStats();

		test.ok(stats)
		test.same(Object.keys(stats).length,2);
		test.same(stats["1"],stats1);
		test.same(stats["3"],stats2);

		//Ok
		test.end();

	});

	
	suite.test("getActiveLayers",function(test){
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");

		//Create new incoming stream
		const incomingStreamTrack1 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack2 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack3 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack4 = transport.createIncomingStreamTrack("video");

		//Add them
		simulcastTrack.addTrack("1",incomingStreamTrack1);
		simulcastTrack.addTrack("2",incomingStreamTrack2);
		simulcastTrack.addTrack("3",incomingStreamTrack3);
		simulcastTrack.addTrack("4",incomingStreamTrack4);

		//Remove one
		incomingStreamTrack2.stop();

		//Fake the stats
		incomingStreamTrack1.getStats = () => ({"" : stats1});
		incomingStreamTrack3.getStats = () => ({"" : stats2});
		incomingStreamTrack4.getStats = () => ({"" : inactive});

		const layers = simulcastTrack.getActiveLayers();

		test.ok(layers)
		test.same(layers.active.length,2);
		test.same(layers.inactive.length,1);
		test.same(layers.layers.length,20);

		//Ok
		test.end();

	});


	suite.test("mirror stream",function(test){
		test.plan(9);

		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");

		//Create new incoming stream
		const incomingStream = transport.createIncomingStream("stream0");
		test.ok(incomingStream);

		//Mirror it
		const mirrored = endpoint.mirrorIncomingStream(incomingStream);
		test.ok(mirrored)

		//Track and encoding events
		incomingStream.on("track",(stream,track)=>{
			test.ok(track)
		});
		mirrored.on("track",(stream,track)=>{
			test.ok(track)
			track.on("encoding", (track,encoding) =>	{
				test.ok(encoding);
			})
		});

		//Add track to original stream
		incomingStream.addTrack(simulcastTrack);

		//Create new incoming stream
		const incomingStreamTrack1 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack2 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack3 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack4 = transport.createIncomingStreamTrack("video");

		//Add them
		simulcastTrack.addTrack("1",incomingStreamTrack1);
		simulcastTrack.addTrack("2",incomingStreamTrack2);
		simulcastTrack.addTrack("3",incomingStreamTrack3);
		simulcastTrack.addTrack("4",incomingStreamTrack4);

		//Check number of encodings
		test.same(incomingStream.getVideoTracks()[0].getEncodings().length,mirrored.getVideoTracks()[0].getEncodings().length);

		//Ok
		test.end();

	});


	suite.test("mute",function(test){
		try {
			test.plan(6);

			let ssrc = 170;
			//Create stream
			const streamInfo = new StreamInfo("stream5");
			//Create track
			const track = new TrackInfo("video", "track7");
			//Add ssrc
			track.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(track);
			//Create new incoming stream
			const incomingStream  = transport.createIncomingStream(streamInfo);
			//Should not fire
			incomingStream.on("muted",(muted)=>{
				test.fail();
			});

			//Get video track
			const videoTrack = incomingStream.getVideoTracks()[0];

			//Create simulcast adapter
			const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		
			//Add it
			simulcastTrack.addTrack("",videoTrack);

			//Mute should trigger in the adapter
			simulcastTrack.once("muted",(muted)=>{
				test.ok(muted);
			});
			//And in the track
			videoTrack.on("muted",(muted)=>{
				test.ok(muted);
			});
			//Should not be muted
			test.ok(!simulcastTrack.isMuted());
			//Mute
			simulcastTrack.mute(true);
			//Should be muted
			test.ok(simulcastTrack.isMuted());
			test.ok(videoTrack.isMuted());
			//Should not be muted
			test.ok(!incomingStream.isMuted());
			
		} catch (error) {
			//Test error
			test.fail(error);
		}
		test.end();
	});
	
	
	suite.test("unmute",function(test){
		try {
			test.plan(5);

			let ssrc = 180;
			//Create stream
			const streamInfo = new StreamInfo("stream6");
			//Create track
			const track = new TrackInfo("audio", "track8");
			//Create track
			const track2 = new TrackInfo("video", "track9");
			//Add same ssrc
			track.addSSRC(ssrc++);
			track2.addSSRC(ssrc);
			//Add it
			streamInfo.addTrack(track);
			streamInfo.addTrack(track2);
			//Create new incoming stream
			const incomingStream  = transport.createIncomingStream(streamInfo);
			//Mute
			incomingStream.mute(true);
			//Get video track
			const videoTrack = incomingStream.getVideoTracks()[0];

			//Should not fire
			incomingStream.on("muted",(muted)=>{
				test.fail();
			});

			//Create simulcast adapter
			const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");

			//Mute it
			simulcastTrack.mute(true);
			
			//Add video track
			simulcastTrack.addTrack("",videoTrack);

			//Event
			simulcastTrack.once("muted",(muted)=>{
				test.ok(!muted);
			});
			videoTrack.on("muted",(muted)=>{
				test.ok(!muted);
			});
			//Mute
			simulcastTrack.mute(false);
			//Should not be muted
			test.ok(!simulcastTrack.isMuted());
			test.ok(!videoTrack.isMuted());
			//Should still be muted
			test.ok(incomingStream.isMuted());
		} catch (error) {
			//Test error
			test.fail(error);
		}
		test.end();
	});


	suite.test("add track while muted",function(test){
		try {
			test.plan(4);

			let ssrc = 190;
			//Create stream
			const streamInfo = new StreamInfo("stream7");
			//Create track
			const track = new TrackInfo("video", "track10");
			//Add ssrc
			track.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(track);
			//Create new incoming stream
			const incomingStream  = transport.createIncomingStream(streamInfo);
			//Should not fire
			incomingStream.on("muted",(muted)=>{
				test.fail("stream muted event");
			});

			//Get video track
			const videoTrack = incomingStream.getVideoTracks()[0];

			//Create simulcast adapter
			const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		
			//Mute should trigger in the added tracki
			videoTrack.on("muted",(muted)=>{
				test.ok(muted, "track muted event");
			});

			//Mute adapter before adding track
			simulcastTrack.mute(true);

			//Add it
			simulcastTrack.addTrack("",videoTrack);

			//Both should be muted
			test.ok(simulcastTrack.isMuted(), "adapter muted");
			test.ok(videoTrack.isMuted()	, "video track muted");
			//Should not be muted
			test.ok(!incomingStream.isMuted(), "stream not muted");
			
		} catch (error) {
		console.error(error);
			//Test error
			test.fail(error);
		}
		test.end();
	});

	suite.end();
})
]).then(()=>MediaServer.terminate ());
