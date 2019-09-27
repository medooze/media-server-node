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



let ssrc = 1;
		
tap.test("IncomingStream",function(suite){
	//Create UDP server endpoints
	const endpoint = MediaServer.createEndpoint("127.0.0.1");
	const mirror   = MediaServer.createEndpoint("127.0.0.1");

	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("empty mirror",function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream0");
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		//Mirror it
		const mirrored = mirror.mirrorIncomingStream(incomingStream);
		test.ok(mirrored)
		//Mirror it again 
		const again = mirror.mirrorIncomingStream(incomingStream);
		test.ok(again)
		test.same(mirrored,again);
		//Ok
		test.end();
	});
	
	suite.test("mirror audio+video",async function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream1");
		//Create track
		let track = new TrackInfo("video", "track1");
		//Get ssrc, rtx and fec 
		const media = ssrc++;
		const rtx = ssrc++;
		const fec = ssrc++;
		//Add ssrcs to track
		track.addSSRC(media);
		track.addSSRC(rtx);
		track.addSSRC(fec);
		//Add RTX and FEC group	
		track.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
		track.addSourceGroup(new SourceGroupInfo("FEC-FR",[media,fec]));
		//Add it
		streamInfo.addTrack(track);
		//Create track
		track = new TrackInfo("audio", "track2");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		//Mirror it
		const mirrored = mirror.mirrorIncomingStream(incomingStream);
		test.ok(mirrored);
		test.same(1,mirrored.getAudioTracks().length);
		test.same(1,mirrored.getVideoTracks().length);
		//Ok
		test.end();
	});
	
	suite.test("mirror twice",async function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream3");
		//Create track
		let track = new TrackInfo("video", "track1");
		//Get ssrc, rtx and fec 
		const media = ssrc++;
		const rtx = ssrc++;
		const fec = ssrc++;
		//Add ssrcs to track
		track.addSSRC(media);
		track.addSSRC(rtx);
		track.addSSRC(fec);
		//Add RTX and FEC group	
		track.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
		track.addSourceGroup(new SourceGroupInfo("FEC-FR",[media,fec]));
		//Add it
		streamInfo.addTrack(track);
		//Create track
		track = new TrackInfo("audio", "track2");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		//Mirror it twice
		const mirrored1 = mirror.mirrorIncomingStream(incomingStream);
		const mirrored2 = mirror.mirrorIncomingStream(incomingStream);
		test.same(mirrored1,mirrored2);
		//Ok
		test.end();
	});
	
	suite.test("stop",async function(test){
		test.plan(1);
		//Create stream
		const streamInfo = new StreamInfo("stream2");
		//Create track
		const track = new TrackInfo("audio", "track3");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		//Mirror it
		const mirrored = mirror.mirrorIncomingStream(incomingStream);
		//Listent for stop
		mirrored.on("stopped",(stream)=>{
			test.ok(stream);
		});
		incomingStream.stop();
		//Ok
		test.end();
	});
	
	suite.end();
});

		
tap.test("Endpoint",function(suite){
	

	suite.test("stop origin",async function(test){
		test.plan(1);
		//Create UDP server endpoints
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		const mirror   = MediaServer.createEndpoint("127.0.0.1");

		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});
		//Create stream
		const streamInfo = new StreamInfo("stream1");
		//Create track
		const track = new TrackInfo("audio", "track1");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		//Mirror it
		const mirrored = mirror.mirrorIncomingStream(incomingStream);
		//Listent for stop
		mirrored.on("stopped",(stream)=>{
			test.ok(stream);
		});
		//Stop mirror endpoint
		endpoint.stop();
	});
	
	suite.test("stop mirror",async function(test){
		test.plan(1);
		//Create UDP server endpoints
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		const mirror   = MediaServer.createEndpoint("127.0.0.1");

		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});
		//Create stream
		const streamInfo = new StreamInfo("stream2");
		//Create track
		const track = new TrackInfo("audio", "track2");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		//Mirror it
		const mirrored = mirror.mirrorIncomingStream(incomingStream);
		//Listent for stop
		mirrored.on("stopped",(stream)=>{
			test.ok(stream);
		});
		//Stop mirror endpoint
		mirror.stop();
	});
	
	suite.end();
});

MediaServer.terminate ();
