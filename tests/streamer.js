const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(true);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);

const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;
const Direction		= SemanticSDP.Direction;
const SourceGroupInfo   = SemanticSDP.SourceGroupInfo;
const CodecInfo		= SemanticSDP.CodecInfo;
const TrackEncodingInfo = SemanticSDP.TrackEncodingInfo;

tap.test("Sreamer::create",async function(suite){
	
	
	suite.test("start+stop",async function(test){
		//Create new streamer
		const streamer = MediaServer.createStreamer();
		test.ok(streamer);
		streamer.stop();
		test.done();
	});
	
	suite.end();
});

MediaServer.terminate ();
