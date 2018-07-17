const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
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

tap.test("IncomingMediaStream::create",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("audio+video",async function(test){
		let ssrc = 100;
		//Create stream
		const streamInfo = new StreamInfo("sream0");
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
		test.ok(incomingStream);
		test.same(1,incomingStream.getAudioTracks().length);
		test.same(1,incomingStream.getVideoTracks().length);
	});
	
	suite.test("simulcast",async function(test){
		let ssrc = 100;
		//Create stream
		const streamInfo = new StreamInfo("sream0");
		//Create track
		let track = new TrackInfo("video", "track1");
		//Get ssrc, rtx and fec 
		const mediaA = ssrc++;
		const rtxA = ssrc++;
		const fecA = ssrc++;
		const mediaB = ssrc++;
		const rtxB = ssrc++;
		const fecB = ssrc++;
		//Add ssrcs to track
		track.addSSRC(mediaA);
		track.addSSRC(rtxA);
		track.addSSRC(fecA);
		track.addSSRC(mediaB);
		track.addSSRC(rtxB);
		track.addSSRC(fecB);
		//Add RTX and FEC group	
		track.addSourceGroup(new SourceGroupInfo("FID",[mediaA,rtxA]));
		track.addSourceGroup(new SourceGroupInfo("FEC-FR",[mediaA,fecA]));
		track.addSourceGroup(new SourceGroupInfo("FID",[mediaB,rtxB]));
		track.addSourceGroup(new SourceGroupInfo("FEC-FR",[mediaB,fecB]));
		//Add encodings
		track.addEncoding(new TrackEncodingInfo("A",false));
		track.addEncoding(new TrackEncodingInfo("B",false));
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
		test.ok(incomingStream);
		test.same(1,incomingStream.getAudioTracks().length);
		test.same(1,incomingStream.getVideoTracks().length);
	});
	
	suite.test("audio",async function(test){
		let ssrc = 110;
		//Create stream
		const streamInfo = new StreamInfo("sream1");
		//Create track
		let track = new TrackInfo("audio", "track2");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream  = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		test.same(1,incomingStream.getAudioTracks().length);
		test.same(0,incomingStream.getVideoTracks().length);
	});
	
	
	suite.test("stop",async function(test){
		let ssrc = 120;
		//Create stream
		const streamInfo = new StreamInfo("sream0");
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
		test.ok(incomingStream);
		//Stop and create new one
		incomingStream.once("stopped",()=>{
			const retry = transport.createIncomingStream(streamInfo);
			test.done(retry);
		});
		//Stop
		incomingStream.stop();
	});
	
	
	suite.end();
});

MediaServer.terminate ();