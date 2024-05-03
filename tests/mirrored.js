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



let ssrc = 1;
	
Promise.all([	
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
		//Mirror it twice
		const mirrored1 = mirror.mirrorIncomingStream(incomingStream);
		const mirrored2 = mirror.mirrorIncomingStream(incomingStream);
		test.same(mirrored1,mirrored2);
		
		// Test remove a track from the original stream would let it removed from
		// mirrored streams as well
		
		let removedTrack  = incomingStream.getTrack("track2");
		
		test.ok(incomingStream.getTrack("track2"));
		test.ok(mirrored1.getTrack("track2"));
		test.ok(mirrored2.getTrack("track2"));
		
		incomingStream.removeTrack("track2");
		
		test.notOk(incomingStream.getTrack("track2"));
		test.notOk(mirrored1.getTrack("track2"));
		test.notOk(mirrored2.getTrack("track2"));
		test.same(mirrored1,mirrored2);
		
		// Stop it manually as it doesn't belong to any stream and wouldn't be
		// stopped when the terminate function is called.
		removedTrack.stop();
		
		//Ok
		test.end();
	});

	suite.test("mute",function(test){
		try {
			test.plan(5);


			//Create stream
			const streamInfo = new StreamInfo("stream4");
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
			//Mirror it
			const mirrored = mirror.mirrorIncomingStream(incomingStream);

			//Muted event
			mirrored.once("muted",(muted)=>{
				test.ok(muted);
			});
			//Should not be muted
			test.ok(!mirrored.isMuted());
			//Mute
			mirrored.mute(true);
			//Should be muted
			test.ok(mirrored.isMuted());
			//All streams should be muted also
			test.ok(mirrored.getAudioTracks()[0].isMuted());
			test.ok(mirrored.getVideoTracks()[0].isMuted());
		} catch (error) {
			console.error(error);
			//Test error
			test.fail(error);
		}
		test.end();
	});
	
	
	suite.test("unmute",function(test){
		try {
			test.plan(4);
			//Create stream
			const streamInfo = new StreamInfo("stream5");
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
			//Mirror it
			const mirrored = mirror.mirrorIncomingStream(incomingStream);
			//Mute
			mirrored.mute(true);
			//Events for unmute
			mirrored.once("muted",(muted)=>{
				test.ok(!muted);
			});
			//Unmute
			mirrored.mute(false);
			//Should be muted
			test.ok(!mirrored.isMuted());
			//All streams should be muted also
			test.ok(!mirrored.getAudioTracks()[0].isMuted());
			test.ok(!mirrored.getVideoTracks()[0].isMuted());
			
		} catch (error) {
			console.error(error);
			//Test error
			test.fail(error);
		}
		test.end();
	});

	suite.test("mute track",function(test){
		try {
			test.plan(5);


			//Create stream
			const streamInfo = new StreamInfo("stream6");
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
			//Mirror it
			const mirrored = mirror.mirrorIncomingStream(incomingStream);

			//Should not fire
			incomingStream.on("muted",(muted)=>{
				test.fail();
			});
			//Get video track
			const videoTrack = incomingStream.getVideoTracks()[0];
			//Should not fire
			videoTrack.once("muted",(muted)=>{
				test.fail();
			});
			//Get mirrored video track
			const mirrorVideoTrack = mirrored.getVideoTracks()[0];
			
			//Should fire
			videoTrack.once("muted",(muted)=>{
				test.ok("track mute event on mirrored track");
			});

			//Should not be muted
			test.ok(!mirrorVideoTrack.isMuted());
			//Mute
			mirrorVideoTrack.mute(true);
			//Should be muted
			test.ok(mirrorVideoTrack.isMuted(), "mirrored track muted");
			//Should not be muted
			test.ok(!videoTrack.isMuted(), "video track not muted");
			test.ok(!mirrored.isMuted(), "stream not muted");
			test.ok(!incomingStream.isMuted(), "mirrored stream not muted");
		} catch (error) {
			console.error(error);
			//Test error
			test.fail(error);
		}
		test.end();
	});
	
	
	suite.test("unmute track",function(test){
		try {
			test.plan(7);
			//Create stream
			const streamInfo = new StreamInfo("stream7");
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
			//Mirror it
			const mirrored = mirror.mirrorIncomingStream(incomingStream);
			//Should not fire
			incomingStream.on("muted",(muted)=>{
				test.fail();
			});
			
			//Get video track
			const videoTrack = incomingStream.getVideoTracks()[0];
			//Should not fire
			videoTrack.once("muted",(muted)=>{
				test.fail();
			});
			//Mute
			mirrored.mute(true);

			//Should not be muted
			test.ok(!videoTrack.isMuted(), "video track not muted");
			test.ok(!incomingStream.isMuted(), "stream not muted");

			//Get mirrored video track
			const mirrorVideoTrack = mirrored.getVideoTracks()[0];

			//Should not fire
			mirrored.on("muted",(muted)=>{
				test.fail();
			});

			//Event
			mirrorVideoTrack.once("muted",(muted)=>{
				test.ok(!muted, "muted event on mirrored track");
			});
			//Mute
			mirrorVideoTrack.mute(false);
			//Should not be muted
			test.ok(!mirrorVideoTrack.isMuted(), "mirrored track not muted");
			//Should still not be muted
			test.ok(!videoTrack.isMuted(), "video track not muted");
			test.ok(!incomingStream.isMuted(), "stream not muted");
			//Should still be muted
			test.ok(mirrored.isMuted(), "mirrored stream muted");
			
		} catch (error) {
			console.error(error);
			//Test error
			test.fail(error);
		}
		test.end();
	});

	suite.test("refresh",async function(test){
		//Create stream
		const streamInfo = new StreamInfo("stream8");
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
		//Add it
		streamInfo.addTrack(track);
		//Create new incoming stream
		const incomingStream = transport.createIncomingStream(streamInfo);
		//Mirror it
		const mirrored = mirror.mirrorIncomingStream(incomingStream);
		//Get mirrored video track
		const mirrorVideoTrack = mirrored.getVideoTracks()[0];

		try
		{
			//Request intra
			mirrorVideoTrack.refresh();
			//Ok
			test.end();
		} catch (error) {
			console.log(error);
			//Ok
			test.fail(error);
		}
		
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
}),

		
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
})

]).then(()=>MediaServer.terminate ());
