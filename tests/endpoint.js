const tap		= require("tap");
const MediaServer	= require("../index");
const SemanticSDP	= require("semantic-sdp");

MediaServer.enableLog(false);


tap.test("Endpoint::create",async function(suite){
	
	await suite.test("start+stop",async function(test){
		//Create UDP server endpoint
		const endpoint = MediaServer.createEndpoint("127.0.0.1");
		//Stop it
		endpoint.stop();
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
	
	suite.end();
});

MediaServer.terminate ();
