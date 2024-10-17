const tap		= require("tap");
const MediaServer	= require("../../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);

const {
	StreamInfo,
	TrackInfo,
	MediaInfo,
	Setup,
	Direction,
	SourceGroupInfo,
	CodecInfo,
	TrackEncodingInfo,
} = require("semantic-sdp");

Promise.all([
tap.test("Sreamer::create",async function(suite){
	
	
	suite.test("start+stop",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		test.ok(streamer);
		streamer.stop();
		test.end();
	});
	
	suite.test("createSession",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		const session = streamer.createSession(new MediaInfo("video","video"),{noRTCP:true});
		session.stop();
		streamer.stop();
		test.end();
	});
	

	suite.test("maxWaitTime",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		const session = streamer.createSession(new MediaInfo("video","video"),{noRTCP:true});
		const track = session.getIncomingStreamTrack();
		track.setMaxWaitTime(100);
		session.stop();
		streamer.stop();
		test.end();
	});

	suite.end();
})
]).then(()=>MediaServer.terminate ());
