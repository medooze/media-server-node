const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);
const endpoint = MediaServer.createEndpoint("127.0.0.1");

const {
	StreamInfo,
	TrackInfo,
	Setup,
	Direction,
	SourceGroupInfo,
	CodecInfo,
} = require("semantic-sdp");

Promise.all([
tap.test("OutgoingMediaStreamTrack::mute",async function(suite){
	
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});
	
	//Create incoming stream
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
	
	suite.test("mute",function(test){
		try {
			test.plan(4);
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				video: true
			}); 
			//Should not fire
			outgoingStream.on("muted",(muted)=>{
				test.fail();
			});
			//Get video track
			const videoTrack = outgoingStream.getVideoTracks()[0];
			
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
			test.ok(!outgoingStream.isMuted());
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	
	suite.test("unmute",function(test){
		try {
			test.plan(3);
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: true,
				video: true
			});
			//Mute
			outgoingStream.mute(true);
			//Get video track
			const videoTrack = outgoingStream.getVideoTracks()[0];
			//Should not fire
			outgoingStream.on("muted",(muted)=>{
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
			test.ok(outgoingStream.isMuted());
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.test("isAttached",function(test){
		try {
			test.plan(2);
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: true,
				video: true
			});
			//Mute
			outgoingStream.mute(true);
			//Get video track
			const videoTrack = outgoingStream.getVideoTracks()[0];
			//Should not be attached
			test.ok(!videoTrack.isAttached());
			//Attach stream
			outgoingStream.attachTo(incomingStream);
			//Should be attached
			test.ok(videoTrack.isAttached());
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});

	suite.test("attach after closed",function(test){
		try {
			test.plan(3);
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: true,
				video: true
			});
			//Mute
			outgoingStream.mute(true);
			//Get video tracks
			const outgoingVideoTrack = outgoingStream.getVideoTracks()[0];
			const incomingVideoTrack = incomingStream.getVideoTracks()[0];
			//Should not be attached
			test.ok(!outgoingVideoTrack.isAttached(), "OutgoingStreamTrack not attached");
			//Stop track
			outgoingVideoTrack.stop();
			//No error yet
			test.pass("OutgoingStreamTrack stopped");
			//Attach stream
			outgoingVideoTrack.attachTo(incomingVideoTrack);
			//Should be attached
			test.error("Cannot attach after close");
		} catch (error) {
			//It should throw an error
			test.ok(error,error.message);
		}
		test.end();
	});

	suite.test("forcePlaoutDelay",function(test){
		try {
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: true,
				video: true
			});
			//Mute
			outgoingStream.mute(true);
			//Get video track
			const videoTrack = outgoingStream.getVideoTracks()[0];
			//Should not fail
			videoTrack.forcePlayoutDelay(0,0);
			//Should be attached
			test.pass("forcePlayoutDelay didn't fail");
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.end();
}),


tap.test("OutgoingMediaStreamTrack::stats",async function(suite){
	
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});
	
	suite.test("cached",function(test){
		//Create new local stream
		const outgoingStream  = transport.createOutgoingStream({
			video: true
		});
		//Get video track
		const videoTrack = outgoingStream.getVideoTracks()[0];
		//Get stats
		const stats = videoTrack.getStats();
		test.ok(stats);
		//Get them again
		const cached = videoTrack.getStats();
		test.ok(cached);
		//Ensure they are the same
		test.same(stats.timestamp,cached.timestamp);
		test.end();
	});
	
	
	suite.end();
})
]).then(()=>MediaServer.terminate ());

