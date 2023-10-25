const tap		= require("tap");
const FileSystem	= require("fs");
const Path		= require("path");
const OS		= require("os");
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
	TrackEncodingInfo,
} = require("semantic-sdp");

const tmp = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), 'tap-'));

Promise.all([
	tap.test("Recorder",async function(suite){

		suite.test("create+stop",async function(test){
			test.plan(2);
			//Get temp file
			const file = Path.join(tmp,"test1.mp4");
			//Create 
			const recorder = MediaServer.createRecorder(file);
			//Get event
			recorder.once("stopped",(that)=>{
				//Done
				test.same(recorder,that);
			});
			
			//Check file exist
			test.ok(FileSystem.existsSync(file));
			
			//Stop
			await recorder.stop();
			
			//Delete it
			FileSystem.unlinkSync(file);
		});

		suite.test("record",async function(test){
			
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});

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
			//Create track
			track = new TrackInfo("audio", "track2");
			//Add ssrc
			track.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(track);
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			
			//Get temp file
			const file = Path.join(tmp,"test2.mp4");
			//Create 
			const recorder = MediaServer.createRecorder(file);
			//Record it
			recorder.record(incomingStream);
			
			//Check file exist
			test.ok(FileSystem.existsSync(file));
			
			//Stop it
			await recorder.stop();
			
			//Delete it
			FileSystem.unlinkSync(file);
		});
		
		suite.test("record+timeshift",async function(test){
			
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});

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
			//Create track
			track = new TrackInfo("audio", "track2");
			//Add ssrc
			track.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(track);
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			
			//Get temp file
			const file = Path.join(tmp,"test2.mp4");
			//Create 
			const recorder = MediaServer.createRecorder(file,{timeShift:10000});
			//Record it
			recorder.record(incomingStream);
			//Check file doesn't exist
			test.notOk(FileSystem.existsSync(file));
			//Flush it
			recorder.flush();
			//Check file exist
			test.ok(FileSystem.existsSync(file));
			
			//Stop it
			await recorder.stop();
			
			//Delete it
			FileSystem.unlinkSync(file);
		});
		
		suite.test("h264ParameterSet",async function(test){
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});

			let ssrc = 100;

			//Create stream
			const streamInfo = new StreamInfo("stream0");
			//Create track
			let track = new TrackInfo("video", "track3");
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
			track = new TrackInfo("audio", "track4");
			//Add ssrc
			track.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(track);
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			//Get video track
			const incomingStreamTrack = incomingStream.getVideoTracks()[0];
			//Set our of band params
			incomingStreamTrack.setH264ParameterSets("J0LgDZWWCgPZ,KM4Ecg==");
			//Get temp file
			const file = Path.join(tmp,"test3.mp4");
			//Create 
			const recorder = MediaServer.createRecorder(file,{timeShift:10000});
			//Record it
			recorder.record(incomingStreamTrack);
			//Check file doesn't exist
			test.notOk(FileSystem.existsSync(file));
			//Flush it
			recorder.flush();
			//Check file exist
			test.ok(FileSystem.existsSync(file));
			
			//Stop it
			await recorder.stop();
			
			//Delete it
			FileSystem.unlinkSync(file);
		});
		
		suite.test("record+disableHints",async function(test){
			
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});

			let ssrc = 100;

			//Create stream
			const streamInfo = new StreamInfo("stream01");
			//Create track
			let track = new TrackInfo("video", "track5");
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
			track = new TrackInfo("audio", "track6");
			//Add ssrc
			track.addSSRC(ssrc++);
			//Add it
			streamInfo.addTrack(track);
			//Create new incoming stream
			const incomingStream = transport.createIncomingStream(streamInfo);
			
			//Get temp file
			const file = Path.join(tmp,"test4.mp4");
			//Create 
			const recorder = MediaServer.createRecorder(file,{disableHints:true});
			//Record it
			recorder.record(incomingStream);
			
			//Check file exist
			test.ok(FileSystem.existsSync(file));
			
			//Stop it
			await recorder.stop();
			
			//Delete it
			FileSystem.unlinkSync(file);
		});

		suite.end();
	})
])
.then(()=>{
	MediaServer.terminate ();
	FileSystem.rmdirSync(tmp);
});

