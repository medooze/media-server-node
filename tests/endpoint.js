const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);

Promise.all([
tap.test("Endpoint::create",async function(suite){
	
	await suite.test("start+stop",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Stop it
		endpoint.stop();
		//Ok
		test.end();
	});
	
	await suite.test("candidate",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//get local candidates
		const candidates = endpoint.getLocalCandidates();
		//Cehck them
		test.same(candidates.length,1);
		test.same(candidates[0].getAddress(),"127.0.0.1");
		//Ok
		test.end();
	});
	await suite.test("candidates",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint(["127.0.0.1","10.0.0.1"]);
		//get local candidates
		const candidates = endpoint.getLocalCandidates();
		//Cehck them
		test.same(candidates.length,2);
		test.same(candidates[0].getAddress(),"127.0.0.1");
		test.same(candidates[1].getAddress(),"10.0.0.1");
		test.ok(candidates[0].getPriority()>candidates[1].getPriority());
		//Ok
		test.end();
	});
	
	await suite.test("setAffinity",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Set affinity
		test.ok(endpoint.setAffinity(0));
		//Unset affinity
		test.ok(endpoint.setAffinity(-1));
		//Ok
		test.end();
	});

	await suite.test("setPriority",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Set RealTime, this could fail if user don't have rights to do it
		endpoint.setPriority(1);
		//Unset RealTime
		test.ok(endpoint.setPriority(0));
		//Ok
		test.end();
	});
	
	await suite.test("stress test",async function(test){
		const endpoints = [];
		//create a lot
		for (let i=0; i<800; ++i)
			//Create UDP server endpoint
			endpoints.push(MediaServer.createEndpoint("127.0.0.1"));
		//For each one
		for (let endpoint of endpoints)
			//Stop it
			endpoint.stop();
		//Ok
		test.end();
	});
	
	await suite.test("setDefaultSRTProtectionProfiles",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Set default profiles
		endpoint.setDefaultSRTProtectionProfiles("SRTP_AEAD_AES_128_GCM:SRTP_AEAD_AES_256_GCM:SRTP_AES128_CM_SHA1_80");
		//Ok
		test.end();
	});

	suite.end();
})
]).then(()=>MediaServer.terminate ());
