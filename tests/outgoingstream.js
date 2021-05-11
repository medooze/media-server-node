const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);
const endpoint = MediaServer.createEndpoint("127.0.0.1");

Promise.all([
tap.test("OutgoingMediaStream::create",async function(suite){
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});

	suite.test("audio+video",async function(test){
		//Create new local stream
		const outgoingStream  = transport.createOutgoingStream({
			audio: true,
			video: true
		});
		test.ok(outgoingStream);
		test.same(1,outgoingStream.getAudioTracks().length);
		test.same(1,outgoingStream.getVideoTracks().length);
	});
	
	suite.test("audio",async function(test){
		//Create new local stream
		const outgoingStream  = transport.createOutgoingStream({
			audio: true
		});
		test.ok(outgoingStream);
		test.same(1,outgoingStream.getAudioTracks().length);
		test.same(0,outgoingStream.getVideoTracks().length);
	});
	
	suite.test("video",async function(test){
		//Create new local stream
		const outgoingStream  = transport.createOutgoingStream({
			video: true
		});
		test.ok(outgoingStream);
		test.same(0,outgoingStream.getAudioTracks().length);
		test.same(1,outgoingStream.getVideoTracks().length);
	});
	
	suite.test("audio+video info",async function(test){
		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});

		//Create new local stream
		const outgoingStream  = transport.createOutgoingStream({
			audio: {
				id: "testaudio",
				ssrcs : { media: 1},
			},
			video: {
				id: "testvideo",
				ssrcs : { media: 2, rtx: 3}
			}
			
		});
		test.ok(outgoingStream);
		test.same(1,outgoingStream.getAudioTracks().length);
		test.same(1,outgoingStream.getVideoTracks().length);
		test.same("testaudio",outgoingStream.getAudioTracks()[0].getId());
		test.same("testvideo",outgoingStream.getVideoTracks()[0].getId());
	});
	
	suite.test("audio+video duplicated ssrc fail",async function(test){
		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});

		try {
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: {
					id: "testaudio",
					ssrcs : { media: 1},
				},
				video: {
					id: "testvideo",
					ssrcs : { media: 1, rtx: 3}
				}

			});
			test.noOk(outgoingStream);
		} catch(error) {
			test.ok(error);
		}
	});
	
	suite.test("audio+video+thumb info",async function(test){
		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});

		//Create new local stream
		const outgoingStream  = transport.createOutgoingStream({
			audio: {
				id: "testaudio",
				ssrcs : { media: 1}
			},
			video: [
				{
					id: "testvideo",
					ssrcs : { media: 2, rtx: 3}
				},
				{
					id: "thumb",
					ssrcs : { media: 5, rtx: 6}
				},
			]
			
		});
		test.ok(outgoingStream);
		test.same(1,outgoingStream.getAudioTracks().length);
		test.same(2,outgoingStream.getVideoTracks().length);
		test.same("testaudio",outgoingStream.getAudioTracks()[0].getId());
		test.same("testvideo",outgoingStream.getVideoTracks()[0].getId());
		test.same("thumb",outgoingStream.getVideoTracks()[1].getId());
	});
	
	suite.end();
}),

tap.test("OutgoingMediaStream::mute",async function(suite){
	
	
	//Init test
	const transport = endpoint.createTransport({
		dtls : SemanticSDP.DTLSInfo.expand({
			"hash"        : "sha-256",
			"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
		}),
		ice  : SemanticSDP.ICEInfo.generate()
	});
	
	suite.test("mute",function(test){
		try {
			test.plan(5);
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: true,
				video: true
			});
			outgoingStream.once("muted",(muted)=>{
				test.ok(muted);
			});
			//Should not be muted
			test.ok(!outgoingStream.isMuted());
			//Mute
			outgoingStream.mute(true);
			//Should be muted
			test.ok(outgoingStream.isMuted());
			//All streams should be muted also
			test.ok(outgoingStream.getAudioTracks()[0].isMuted());
			test.ok(outgoingStream.getVideoTracks()[0].isMuted());
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	
	suite.test("unmute",function(test){
		try {
			test.plan(4);
			//Create new local stream
			const outgoingStream  = transport.createOutgoingStream({
				audio: true,
				video: true
			});
			//Mute
			outgoingStream.mute(true);
			//Events for unmute
			outgoingStream.once("muted",(muted)=>{
				test.ok(!muted);
			});
			//Unmute
			outgoingStream.mute(false);
			//Should be muted
			test.ok(!outgoingStream.isMuted());
			//All streams should be muted also
			test.ok(!outgoingStream.getAudioTracks()[0].isMuted());
			test.ok(!outgoingStream.getVideoTracks()[0].isMuted());
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.end();
})
]).then(()=>MediaServer.terminate ());
