const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);

const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const Setup		= SemanticSDP.Setup;
const Direction		= SemanticSDP.Direction;
const SourceGroupInfo   = SemanticSDP.SourceGroupInfo;
const CodecInfo		= SemanticSDP.CodecInfo;
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;

Promise.all([
tap.test("Sreamer::create",async function(suite){
	
	
	suite.test("start+stop",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		test.ok(streamer);
		streamer.stop();
		test.done();
	});
	
	suite.test("createSession",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		const session = streamer.createSession(new MediaInfo("video","video"),{noRTCP:true});
		session.stop();
		streamer.stop();
		test.done();
	});
	

	suite.test("maxWaitTime",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		const session = streamer.createSession(new MediaInfo("video","video"),{noRTCP:true});
		const track = session.getIncomingStreamTrack();
		track.setMaxWaitTime(100);
		session.stop();
		streamer.stop();
		test.done();
	});

	suite.end();
})
]).then(()=>MediaServer.terminate ());
