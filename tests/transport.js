const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(true);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);
const endpoint = MediaServer.createEndpoint("127.0.0.1");

const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;
const Direction		= SemanticSDP.Direction;
const SourceGroupInfo   = SemanticSDP.SourceGroupInfo;
const CodecInfo		= SemanticSDP.CodecInfo;
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;

tap.test("Probing",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("getStats",async function(test){
		//Create new incoming stream
		const stats = transport.getStats();
		test.ok(stats);
		test.done();
	});
	
	suite.test("setBandwidthProbing",async function(test){
		//Create new incoming stream
		transport.setBandwidthProbing(true);
		transport.setBandwidthProbing(false);
		transport.setBandwidthProbing(1);
		transport.setBandwidthProbing(0);
		test.done();
	});
	
	suite.test("setMaxProbingBitrate",async function(test){
		//Create new incoming stream
		transport.setBandwidthProbing(1000);
		test.done();
	});
	
	suite.end();
});

tap.test("Tracks::create",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("incoming",async function(test){
		//Create new incoming stream
		const incomingStreamTrack = transport.createIncomingStreamTrack("audio");
		test.ok(incomingStreamTrack);
	});
	
	suite.test("outgoing",async function(test){
		//Create new incoming stream
		const outgoingStreamTrack = transport.createOutgoingStreamTrack("video");
		test.ok(outgoingStreamTrack);
	});
	
	suite.end();
});

tap.test("Stop",async function(suite){
	

	suite.test("Transport::stop()",async function(test){
		test.plan(2);
		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});
		//Listen event
		transport.once("stopped",()=>{
			//Create new incoming stream
			test.pass();
		});
		//Stop it
		transport.stop();
		//OK
		test.pass();
		
	});
	
	suite.test("Endooint::stop",async function(test){
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		
		test.plan(2);
		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});
		//Listen event
		transport.once("stopped",()=>{
			//Create new incoming stream
			test.pass();
		});
		//Stop it
		endpoint.stop();
		//OK
		test.pass();
	});
	
	suite.end();
});

MediaServer.terminate ();
