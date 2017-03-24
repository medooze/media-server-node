const SemanticSDP	= require("semantic-sdp");
const MediaInfo		= SemanticSDP.MediaInfo;
const CodecInfo		= SemanticSDP.CodecInfo;


//Get the Medooze Media Server interface
const MediaServer = require("../index");

//Enable debug
MediaServer.enableDebug(true);

//Create new streamer
const streamer = MediaServer.createStreamer();

//Create new video session codecs
const video = new MediaInfo("video","video");

//Add h264 codec
video.addCodec(new CodecInfo("h264",96));

//Create session for video
const session = streamer.createSession(video,{
	local  : {
		port: 5004
	},
	remote : {
		ip : "192.168.1.1",
		port: 123456
	}
});

//Attach outgoing to incomming
session.getOutgoingStreamTrack().attachTo(session.getIncomingStreamTrack());

//Stop it
session.stop();

//Stop streamer
streamer.stop();
