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

//Create stream
let ssrc = 1;
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
//Create track
track = new TrackInfo("audio", "track2");
//Add ssrc
track.addSSRC(ssrc++);
//Add it
streamInfo.addTrack(track);

Promise.all([
tap.test("Refresher",async function(suite){
	
	
	suite.test("start+stop",function(test){
		try {
			//Create refresher
			const refresher = MediaServer.createRefresher(100);
			//Stop refresher
			refresher.stop();
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.test("strem+stop refresher",function(test){
		try {
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			//Create refresher
			const refresher = MediaServer.createRefresher(100);
			//Do periodic refresh
			refresher.add(incomingStream);
			//Stop refresher
			refresher.stop();
			//Stop stream
			incomingStream.stop();
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.test("stream stop",function(test){
		try {
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			//Create refresher
			const refresher = MediaServer.createRefresher(100);
			//Do periodic refresh
			refresher.add(incomingStream);
			//Stop stream
			incomingStream.stop();
			//Stop refresher
			refresher.stop();
		} catch (error) {
			//Test error
			test.notOk(error,error);
		}
		test.end();
	});
	
	suite.end();
})
]).then(()=>MediaServer.terminate ());

