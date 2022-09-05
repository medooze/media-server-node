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

	await suite.test("create",async function(test){
		let ssrc = 100;
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
		//Add RTX  group	
		track.addSourceGroup(new SourceGroupInfo("FID",[media,rtx]));
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
		test.done();
		
	});
	
	await suite.test("track stop",async function(test){
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
	
	
	await suite.test("stream stop",async function(test){
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

	await suite.test("waiting time",async function(test){
		let ssrc = 160;
		//Create stream
		const streamInfo = new StreamInfo("stream4");
		//Create track
		const track = new TrackInfo("audio", "track6");
		//Add ssrc
		track.addSSRC(ssrc++);
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		test.ok(incomingStream);
		//Get audio track
		const audioTrack = incomingStream.getAudioTracks()[0];
		//Set max wait time
		audioTrack.setMaxWaitTime(100);
		//Reset it
		audioTrack.resetMaxWaitTime();
		test.done();
	});
	
	await suite.test("duplicate ssrc",async function(test){
		let ssrc = 150;
		//Create stream
		const streamInfo = new StreamInfo("stream3");
		//Create track
		const track = new TrackInfo("audio", "track4");
		//Create track
		const track2 = new TrackInfo("audio", "track5");
		//Add same ssrc
		track.addSSRC(ssrc);
		track2.addSSRC(ssrc);
		//Add it
		streamInfo.addTrack(track);
		streamInfo.addTrack(track2);
		try {
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			test.notOk();
		} catch(e) {
			test.ok(e);
		}
		test.done();
	});

	suite.test("mute",function(test){
		try {
			test.plan(4);

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
			
			videoTrack.once("muted",(muted)=>{
				test.ok(muted);
			});
			//Should not be muted
			test.ok(!videoTrack.isMuted());
			//Mute
			videoTrack.mute(true);
			//Should be muted
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
			test.plan(3);

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

			//Event
			videoTrack.once("muted",(muted)=>{
				test.ok(!muted);
			});
			//Mute
			videoTrack.mute(false);
			//Should not be muted
			test.ok(!videoTrack.isMuted());
			//Should still be muted
			test.ok(incomingStream.isMuted());
		} catch (error) {
			//Test error
			test.fail(error);
		}
		test.end();
	});

	transport.stop();
	
	suite.end();
}),


tap.test("IncomingMediaStream::stats",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	await suite.test("cached",async function(test){
		let ssrc = 100;
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
	
	transport.stop();
	suite.end();
})
]).then(()=>{
endpoint.stop();
MediaServer.terminate();
});
