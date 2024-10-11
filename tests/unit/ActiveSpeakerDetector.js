const tap		= require("tap");
const MediaServer	= require("../../index");
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

//Init test
const transport = endpoint.createTransport({
	dtls : SemanticSDP.DTLSInfo.expand({
		"hash"        : "sha-256",
		"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
	}),
	ice  : SemanticSDP.ICEInfo.generate()
});

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
//Get audio track
const audioTrack = incomingStream.getAudioTracks()[0];

Promise.all([
tap.test("ActiveSpeaker",async function(suite){
	
	suite.test("create+stop",async function(test){
		//Create active speaker detector
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Stop 
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	
	suite.test("setters",async function(test){
		//Create active speaker detector
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Set different params
		activeSpeakerDetector.setNoiseGatingThreshold(127);
		activeSpeakerDetector.setMaxAccumulatedScore(2500);
		activeSpeakerDetector.setMinChangePeriod(2000);
		activeSpeakerDetector.setMinActivationScore(100);
		//Stop it
		activeSpeakerDetector.stop();
		//Done
		test.end();
	});
	
	suite.test("add speaker",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	suite.test("add speaker twice",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		
		try {
			//This should fail
			activeSpeakerDetector.addSpeaker(audioTrack);
			test.fail();
		} catch (e) {
			test.pass();
		}
		
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	
	suite.test("remove speaker",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		//Add speaker audio track
		activeSpeakerDetector.removeSpeaker(audioTrack);
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	suite.test("remove speaker twice",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		//Add speaker audio track
		activeSpeakerDetector.removeSpeaker(audioTrack);
		try {
			//This should fail
			activeSpeakerDetector.removeSpeaker(audioTrack);
			test.fail();
		} catch (e) {
			test.pass();
		}
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	suite.test("remove without add",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		try {
			//This should fail
			activeSpeakerDetector.removeSpeaker(audioTrack);
			test.fail();
		} catch (e) {
			test.pass();
		}
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	
	suite.test("remove and add speaker",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		//Add speaker audio track
		activeSpeakerDetector.removeSpeaker(audioTrack);
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	suite.test("stop speaker track",async function(test){
		const activeSpeakerDetector = MediaServer.createActiveSpeakerDetector();
		//Add speaker audio track
		activeSpeakerDetector.addSpeaker(audioTrack);
		//Remove speaker audio track
		audioTrack.stop();
		//Stop
		activeSpeakerDetector.once("stopped",()=>{
			test.end();
		});
		//Stop it
		activeSpeakerDetector.stop();
	});
	
	suite.end();
})
]).then(()=>MediaServer.terminate ());
