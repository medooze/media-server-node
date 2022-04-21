const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;
const Direction		= SemanticSDP.Direction;
const SourceGroupInfo   = SemanticSDP.SourceGroupInfo;
const CodecInfo		= SemanticSDP.CodecInfo;
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;


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
		test.plan(2);
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		test.ok(simulcastTrack)

		//Create new incoming stream
		const incomingStreamTrack = transport.createIncomingStreamTrack("video");

		//Add it
		simulcastTrack.addTrack("",incomingStreamTrack);

		//Listent for stop
		simulcastTrack.on("stopped",(track)=>{
			test.ok(track);
		});
		simulcastTrack.stop();
		//Ok
		test.end();
	});


	suite.test("stop track",function(test){
		test.plan(2);
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");
		test.ok(simulcastTrack)

		//Create new incoming stream
		const incomingStreamTrack1 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack2 = transport.createIncomingStreamTrack("video");

		//Add it
		simulcastTrack.addTrack("1",incomingStreamTrack1);
		simulcastTrack.addTrack("2",incomingStreamTrack2);

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
		//Create simulcast adapter
		const simulcastTrack = MediaServer.createIncomingStreamTrackSimulcastAdapter("video");

		//Create new incoming stream
		const incomingStreamTrack1 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack2 = transport.createIncomingStreamTrack("video");
		const incomingStreamTrack3 = transport.createIncomingStreamTrack("video");

		//Add them
		simulcastTrack.addTrack("1",incomingStreamTrack1);
		simulcastTrack.addTrack("2",incomingStreamTrack2);
		simulcastTrack.addTrack("3",incomingStreamTrack3);

		//Fake the stats
		incomingStreamTrack1.getStats = () => ({"" : stats1});
		incomingStreamTrack3.getStats = () => ({"" : stats2});

		//Remove one
		incomingStreamTrack2.stop();

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
	suite.end();
})
]).then(()=>MediaServer.terminate ());
