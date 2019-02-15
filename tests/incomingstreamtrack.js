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

tap.test("IncomingMediaStream::create",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("create",async function(test){
		let ssrc = 100;
		//Create stream
		const streamInfo = new StreamInfo("stream0");
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
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		//Get new track
		const videoTrack = incomingStream.getVideoTracks()[0];
		//Get ssrcs
		const ssrcs = videoTrack.getSSRCs();
		//Check them
		test.equals(Object.keys(ssrcs).length,1);
		test.equals(ssrcs[""].media.ssrc,media);
		test.equals(ssrcs[""].rtx.ssrc,rtx);
		test.equals(ssrcs[""].fec.ssrc,fec);
		test.done();
		
	});
	
	suite.test("track stop",async function(test){
		let ssrc = 120;
		//Create stream
		const streamInfo = new StreamInfo("stream1");
		//Create track
		const track = new TrackInfo("audio", "track2");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		//Get audio track
		const audioTrack = incomingStream.getAudioTracks()[0];
		//Stop and create new one
		audioTrack.once("stopped",()=>{
			//Create stream
			const streamInfo = new StreamInfo("stream1bis");
			//Add tracks
			streamInfo.addTrack(track);
			//Create another one
			const retry = transport.createIncomingStream(streamInfo);
			test.done(retry);
		});
		//Stop
		audioTrack.stop();
	});
	
	
	suite.test("stream stop",async function(test){
		let ssrc = 140;
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
		test.ok(incomingStream);
		//Get audio track
		const audioTrack = incomingStream.getAudioTracks()[0];
		//Stop and create new one
		audioTrack.once("stopped",()=>{
			//Create stream
			const streamInfo = new StreamInfo("stream2bis");
			//Add tracks
			streamInfo.addTrack(track);
			//New one
			const retry = transport.createIncomingStream(streamInfo);
			test.done(retry);
		});
		//Stop
		incomingStream.stop();
	});
	
	
	suite.end();
});


tap.test("IncomingMediaStream::stats",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("cached",async function(test){
		let ssrc = 100;
		//Create stream
		const streamInfo = new StreamInfo("stream0");
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
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		//Get new track
		const videoTrack = incomingStream.getVideoTracks()[0];
		//Get stats
		const stats = videoTrack.getStats();
		test.ok(stats);
		//Get them again
		const cached = videoTrack.getStats();
		test.ok(cached);
		//Ensure they are the same
		test.same(stats[''].timestamp,cached[''].timestamp);
		test.done();
		
	});
	
	suite.end();
});


MediaServer.terminate ();
