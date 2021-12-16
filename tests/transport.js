const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");
const FileSystem	= require("fs");
const Path		= require("path");
const OS		= require("os");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);
const endpoint = MediaServer.createEndpoint("127.0.0.1");

const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const Setup		= SemanticSDP.Setup;
const Direction		= SemanticSDP.Direction;

const tmp = FileSystem.mkdtempSync(Path.join(OS.tmpdir(), 'tap-'));

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

Promise.all([
	tap.test("Transport",async function(suite){


		suite.test("ice+dtls",async function(test){
			test.plan(4);
			//create endpoints
			const localEndpoint	= MediaServer.createEndpoint ("127.0.0.1");
			const remoteEndpoint	= MediaServer.createEndpoint ("127.0.0.1");
			
			//Genereate info
			const localInfo = {
				dtls		: new DTLSInfo(Setup.ACTIVE,"sha-256",localEndpoint.getDTLSFingerprint()),
				ice		: ICEInfo.generate(true),
			};
			const remoteInfo = {
				dtls		: new DTLSInfo(Setup.PASSIVE,"sha-256",remoteEndpoint.getDTLSFingerprint()),
				ice		: ICEInfo.generate(true),
			};

			//Create transports
			const sender		= localEndpoint.createTransport (localInfo,remoteInfo,{disableSTUNKeepAlive: true});
			const receiver		= remoteEndpoint.createTransport (remoteInfo,localInfo,{disableSTUNKeepAlive: true});
			//wait for ice events
			sender.once("remoteicecandidate",(candidate)=>{
				test.ok(candidate);
			});
			receiver.once("remoteicecandidate",(candidate)=>{
				test.ok(candidate);
			});
			//wait for dtls events
			sender.once("dtlsstate",(state)=>{
				test.same(state,"connected");
			});
			receiver.once("dtlsstate",(state)=>{
				test.same(state,"connected");
			});
			//Add candidates
			sender.addRemoteCandidate(remoteEndpoint.getLocalCandidates()[0]);
			receiver.addRemoteCandidate(localEndpoint.getLocalCandidates()[0]);
			
			await sleep(4000);
			
			sender.stop();
			receiver.stop();
			localEndpoint.stop();
			remoteEndpoint.stop();
		});

		suite.test("ice restart",async function(test){
			test.plan(1);
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});
			//Restart ice
			const restarted = transport.restartICE(SemanticSDP.ICEInfo.generate());
			//Done
			test.ok(restarted);
			//Stop transport
			transport.stop();
		});
		
		suite.test("ice timeout",async function(test){
			test.plan(1);
			//create endpoints
			const localEndpoint	= MediaServer.createEndpoint ("127.0.0.1");
			const remoteEndpoint	= MediaServer.createEndpoint ("127.0.0.1");
			
			//Genereate info
			const localInfo = {
				dtls		: new DTLSInfo(Setup.ACTIVE,"sha-256",localEndpoint.getDTLSFingerprint()),
				ice		: ICEInfo.generate(true),
			};
			const remoteInfo = {
				dtls		: new DTLSInfo(Setup.PASSIVE,"sha-256",remoteEndpoint.getDTLSFingerprint()),
				ice		: ICEInfo.generate(true),
			};

			//Retry fast
			localEndpoint.setIceTimeout(100);
			
			//Create sender transports
			const sender		= localEndpoint.createTransport (localInfo,remoteInfo,{disableSTUNKeepAlive: true});
			
			//This should trigger
			sender.once("remoteicecandidate",(candidate)=>{
				test.ok(candidate);
			});
			
			//Add candidate for receiver before creating it, this should make first check fail
			sender.addRemoteCandidate(remoteEndpoint.getLocalCandidates()[0]);
			
			await sleep(1000);
			
			//Create now the receiver
			const receiver		= remoteEndpoint.createTransport (remoteInfo,localInfo,{disableSTUNKeepAlive: true});
			
			await sleep(4000);
			
			sender.stop();
			receiver.stop();
			localEndpoint.stop();
			remoteEndpoint.stop();
		});
		
		suite.end();
	}),
	tap.test("Override BWE", async function (suite)
	{

		suite.test("create+set", async function (test)
		{
			//Init test
			const transport = endpoint.createTransport({
				dtls: SemanticSDP.DTLSInfo.expand({
					"hash": "sha-256",
					"fingerprint": "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice: SemanticSDP.ICEInfo.generate()
			}, null, {
				overrideBWE: true
			});

			//Set override
			transport.setRemoteOverrideBitrate(1000000);
			test.done();
		});

		suite.end();
	}),
	tap.test("Get available outgoing bitrate", async function (suite)
	{

		suite.test("create+set", async function (test)
		{
			//Init test
			const transport = endpoint.createTransport({
				dtls: SemanticSDP.DTLSInfo.expand({
					"hash": "sha-256",
					"fingerprint": "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice: SemanticSDP.ICEInfo.generate()
			}, null, {
				overrideBWE: true
			});

			//Set override
			transport.getAvailableOutgoingBitrate();
			test.done();
		});

		suite.end();
	}),
	tap.test("Probing",async function(suite){

		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});

		suite.test("getStats",async function(test){
			//Create new incoming stream
			const stats = transport.getStats();
			test.ok(stats);
			test.done();
		});

		suite.test("setBandwidthProbing",async function(test){
			//Create new incoming stream
			transport.setBandwidthProbing(true);
			transport.setBandwidthProbing(false);
			transport.setBandwidthProbing(1);
			transport.setBandwidthProbing(0);
			test.done();
		});

		suite.test("setMaxProbingBitrate",async function(test){
			//Create new incoming stream
			transport.setBandwidthProbing(1000);
			test.done();
		});

		suite.end();
	}),
	tap.test("Tracks::create",async function(suite){

		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});

		suite.test("incoming",async function(test){
			//Create new incoming stream
			const incomingStreamTrack = transport.createIncomingStreamTrack("audio");
			test.ok(incomingStreamTrack);
		});

		suite.test("outgoing",async function(test){
			//Create new incoming stream
			const outgoingStreamTrack = transport.createOutgoingStreamTrack("video");
			test.ok(outgoingStreamTrack);
		});

		suite.end();
	}),
	tap.test("Stop",async function(suite){


		suite.test("Transport::stop()",async function(test){
			test.plan(2);
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});
			//Listen event
			transport.once("stopped",()=>{
				//Create new incoming stream
				test.pass();
			});
			//Stop it
			transport.stop();
			//OK
			test.pass();

		});

		suite.test("Endooint::stop",async function(test){
			const endpoint = MediaServer.createEndpoint("127.0.0.1");

			test.plan(2);
			//Init test
			const transport = endpoint.createTransport({
				dtls : SemanticSDP.DTLSInfo.expand({
					"hash"        : "sha-256",
					"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
				}),
				ice  : SemanticSDP.ICEInfo.generate()
			});
			//Listen event
			transport.once("stopped",()=>{
				//Create new incoming stream
				test.pass();
			});
			//Stop it
			endpoint.stop();
			//OK
			test.pass();
		});

		suite.end();
	}),
	tap.test("Dump",async function(suite){
		
		//Init test
		const transport = endpoint.createTransport({
			dtls : SemanticSDP.DTLSInfo.expand({
				"hash"        : "sha-256",
				"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
			}),
			ice  : SemanticSDP.ICEInfo.generate()
		});

		suite.test("start + stop",async function(test){
			//Get temp file
			const pcap = Path.join(tmp,"dump.pcap");
			const csv = Path.join(tmp,"dump.csv");
			
			//Dump
			transport.dump(pcap);
			
			//Check file exist
			test.ok(pcap);
			test.ok(csv);
			
			//Stop it
			transport.stopDump();
			
			//Delete it
			FileSystem.unlinkSync(pcap);
			FileSystem.unlinkSync(csv);

		});

		
		suite.end();
	}),
])
.then(()=>{
	MediaServer.terminate ();
});
