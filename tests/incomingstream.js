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

Promise.all([
	
tap.test("IncomingMediaStream::create",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	let ssrc = 100;

	suite.test("audio+video",async function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream0");
		//Create track
		let track = new TrackInfo("video", "track1");
		//Get ssrc and rtx
		const media = ssrc++;
		const rtx = ssrc++;
		//Add ssrcs to track
		track.addSSRC(media);
		track.addSSRC(rtx);
		//Add RTX group	
		track.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
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
		//Create stream
		const streamInfo = new StreamInfo("stream1");
		//Create track
		let track = new TrackInfo("video", "track1");
		//Get ssrc and rtx
		const mediaA = ssrc++;
		const rtxA = ssrc++;
		const mediaB = ssrc++;
		const rtxB = ssrc++;
		//Add ssrcs to track
		track.addSSRC(mediaA);
		track.addSSRC(rtxA);
		track.addSSRC(mediaB);
		track.addSSRC(rtxB);
		//Add RTX group	
		track.addSourceGroup(new SourceGroupInfo("FID",[mediaA,rtxA]));
		track.addSourceGroup(new SourceGroupInfo("FID",[mediaB,rtxB]));
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
		//Create stream
		const streamInfo = new StreamInfo("stream2");
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
	
	
	suite.test("duplicated",async function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream3");
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
		
		try {
			//Create duplicated incoming stream
			const incomingStream  = transport.createIncomingStream(streamInfo);
			//Should fail
			test.fail();
		} catch(error) {
			//Must throw error
			test.ok(error);
		}
	});
	
	suite.test("stop",async function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream4");
		//Create track
		let videoTrack = new TrackInfo("video", "track1");
		//Get ssrc and rtx
		const media = ssrc++;
		const rtx = ssrc++;
		//Add ssrcs to track
		videoTrack.addSSRC(media);
		videoTrack.addSSRC(rtx);
		//Add RTX group	
		videoTrack.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
		//Add it
		streamInfo.addTrack(videoTrack);
		//Create track
		let audioTrack = new TrackInfo("audio", "track2");
		//Add ssrc
		audioTrack.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(audioTrack);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		//Stop and create new one
		incomingStream.once("stopped",()=>{
			//Create stream
			const streamInfo = new StreamInfo("stream4bis");
			//Add tracks
			streamInfo.addTrack(videoTrack);
			streamInfo.addTrack(audioTrack);
			//Do it again
			const retry = transport.createIncomingStream(streamInfo);
			test.end(retry);
		});
		//Stop
		incomingStream.stop();
	});
	
	suite.test("mute",function(test){
		try {
			test.plan(5);
			//Create stream
			const streamInfo = new StreamInfo("stream5");
			//Create track
			let videoTrack = new TrackInfo("video", "track1");
			//Get ssrc and rtx
			const media = ssrc++;
			const rtx = ssrc++;
			//Add ssrcs to track
			videoTrack.addSSRC(media);
			videoTrack.addSSRC(rtx);
			//Add RTX group	
			videoTrack.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
			//Add it
			streamInfo.addTrack(videoTrack);
			//Create track
			let audioTrack = new TrackInfo("audio", "track2");
			//Add ssrc
			audioTrack.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(audioTrack);
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			//Muted event
			incomingStream.once("muted",(muted)=>{
				test.ok(muted, "got mutted event on stream");
			});
			//Should not be muted
			test.ok(!incomingStream.isMuted(), "stream is not mutted");
			//Mute
			incomingStream.mute(true);
			//Should be muted
			test.ok(incomingStream.isMuted(), "stream is mutted");
			//All streams should be muted also
			test.ok(incomingStream.getAudioTracks()[0].isMuted(), "audio track is be muted");
			test.ok(incomingStream.getVideoTracks()[0].isMuted()), "video track is muted";
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	
	suite.test("unmute",function(test){
		try {
			test.plan(4);
			//Create stream
			const streamInfo = new StreamInfo("stream6");
			//Create track
			let videoTrack = new TrackInfo("video", "track1");
			//Get ssrc and rtx
			const media = ssrc++;
			const rtx = ssrc++;
			//Add ssrcs to track
			videoTrack.addSSRC(media);
			videoTrack.addSSRC(rtx);
			//Add RTX group	
			videoTrack.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
			//Add it
			streamInfo.addTrack(videoTrack);
			//Create track
			let audioTrack = new TrackInfo("audio", "track2");
			//Add ssrc
			audioTrack.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(audioTrack);
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			//Mute
			incomingStream.mute(true);
			//Events for unmute
			incomingStream.once("muted",(muted)=>{
				test.ok(!muted, "got muted event with !muted");
			});
			//Unmute
			incomingStream.mute(false);
			//Should be muted
			test.ok(!incomingStream.isMuted(), "stream is not muted");
			//All streams should be muted also
			test.ok(!incomingStream.getAudioTracks()[0].isMuted(), "audio track is not muted");
			test.ok(!incomingStream.getVideoTracks()[0].isMuted(), "video track is not muted");
		} catch (error) {
		console.dir(error)
			//Test error
			test.notOk(error,error.message);
		}
		test.end();
	});

	suite.end();
})
]).then(()=>MediaServer.terminate ());
