const tap		= require("tap");
const MediaServer	= require("../../index");
const FS		= require("fs");
const Path		= require("path");


MediaServer.enableLog(false);
MediaServer.enableDebug(false);
MediaServer.enableUltraDebug(false);

Promise.all([
tap.test("MediaServer",async function(suite){
	
	suite.test("capabilities",function(test){
		//This shoudl work
		test.ok(MediaServer.getDefaultCapabilities());
		//Done
		test.end();
	});
	suite.test("ports",function(test){
		//This shoudl fail
		test.notOk(MediaServer.setPortRange(1024));
		test.notOk(MediaServer.setPortRange(20000,10000));
		//This shoudl work
		test.ok(MediaServer.setPortRange(10000,20000));
		test.ok(MediaServer.setPortRange(1024,65535));
		//Done
		test.end();
	});
	suite.test("affinity",function(test){
		//This shoudl work
		test.ok(MediaServer.setAffinity(0));
		test.ok(MediaServer.setAffinity(1));
		test.ok(MediaServer.setAffinity(0));
		//Done
		test.end();
	});
	
}),
tap.test("setCertificate",async function(suite){

	//Create temp dir
	const tmp = FS.mkdtempSync("media-server-test");
	const crt = Path.join(tmp,"dtls.crt");
	const key = Path.join(tmp,"dtls.key");

	FS.writeFileSync(crt, 
		"-----BEGIN CERTIFICATE-----\n"+
		"MIICZjCCAc+gAwIBAgIUJSvfeChZUhLTSAfwzfaewR5+EoowDQYJKoZIhvcNAQEL\n"+
		"BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM\n"+
		"GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0xOTA5MzAxMzU3MzlaFw0yOTA5\n"+
		"MjcxMzU3MzlaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw\n"+
		"HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwgZ8wDQYJKoZIhvcNAQEB\n"+
		"BQADgY0AMIGJAoGBANkVSxQsFmL1lD4VQnNIkexYZGMDRSEFOv3yZFjij83tROa0\n"+
		"kGehh47zCjAiAwPH4ilkI3L7e4z8JX1c0HehxVi9i04Tr30lQzqa3F4PgnILnGgD\n"+
		"DI0gSgqPt2d8NP8aL6ZGGnX1aylXKwaHlhSsYBY5Z3zfqZSgQ+XbJtXVZPttAgMB\n"+
		"AAGjUzBRMB0GA1UdDgQWBBRefMNLTFppj3AkjM3ugzTEUvhycjAfBgNVHSMEGDAW\n"+
		"gBRefMNLTFppj3AkjM3ugzTEUvhycjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3\n"+
		"DQEBCwUAA4GBAJUHNMdKh2XK51l59mi3qQJETpj4RS0di5562+qm3GoSsdZgRim/\n"+
		"p2H88TW6LpUmWfP8xSt6st0sj7iyd6D7RItxhqm63UnLG82YvuE5UFIkoF8LBg/K\n"+
		"u769R4okgogUu9gzpu4LmjKvUr7LORzRMVb5SLvDo8HE5p9+DN46LXO1\n"+
		"-----END CERTIFICATE-----\n"
	);
	FS.writeFileSync(key, 
		"-----BEGIN PRIVATE KEY-----\n"+
		"MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBANkVSxQsFmL1lD4V\n"+
		"QnNIkexYZGMDRSEFOv3yZFjij83tROa0kGehh47zCjAiAwPH4ilkI3L7e4z8JX1c\n"+
		"0HehxVi9i04Tr30lQzqa3F4PgnILnGgDDI0gSgqPt2d8NP8aL6ZGGnX1aylXKwaH\n"+
		"lhSsYBY5Z3zfqZSgQ+XbJtXVZPttAgMBAAECgYEAp+apQDvtQLMS6oXE9Keffb7M\n"+
		"PiysTiLegsX0yS7K7QpkLVBhFFZCI9Vk/t9/l3AFQ+BY7rkF0YDAelrMPotXt6NJ\n"+
		"3WjXlrwP/aspCHl7A5lTwd1oP8Y7k2JnFt1iqPE9GkklqeBvbz5SFBqBvatMt3wJ\n"+
		"bBKq4haFZhfGlr7gRV0CQQD1DqxKfzyMCAuGvzCDKVrkX1FEMQh8TnNbX6U/s8I+\n"+
		"hJdjDMveEUf7J7wb2+BzGODRkmMiQ4vUY3dNjCXoLRYzAkEA4sbWz8Odfg+3Z0U5\n"+
		"dFnfc1yRKqHwAn6KG98HBoiW5vsau+H321sS5mwyEeGlkyiEtVOJcbqDg5+FXCHQ\n"+
		"L6/H3wJBAK5DPOnNCTVbEzdDBjB/XA9CaPvhEnOzJf04Sr6+CceDalQZaXAFQfas\n"+
		"DuyQs0+lxVnCi5R2DB2AjforS1mLllkCQGZS9+xJRI/0AXo8dv8z6ipAc1P8O7K0\n"+
		"bBbFXIMrMIPKe7aY8GBuyKll2nXNDgvHdZHnvpWtZdgHK4J1010hAJsCQQDgi4Vo\n"+
		"IoaX0kHnOTU4/vYr10e9TmhDkn3wNTJYbtFPFp3y5wRWV9/4rCHfRfuNu7BZRvhh\n"+
		"z6Ubyuw+P0hnr04k\n"+
		"-----END PRIVATE KEY-----\n"
	);

	await suite.test("not found",function(test){
		try {
			//Set empty certificate
			MediaServer.setCertificate("crt","key");
			//Should not get here
			test.fail();
		} catch (error) {
			//Test forerror
			test.end();
		}
	});
	
	
	await suite.test("fail",function(test){
		try {
			//Set empty certificate
			MediaServer.setCertificate(key,crt);
			//Should not get here
			test.fail();
		} catch (error) {
			//Test forerror
			test.end();
		}
	});
	
	await suite.test("empty",function(test){
		try {
			//Set empty certificate
			MediaServer.setCertificate("","");
			//Should not get here
			test.fail();
		} catch (error) {
			//Test forerror
			test.end();
		}
	});
	await suite.test("success",function(test){
		try {
			//Set empty certificate
			MediaServer.setCertificate(crt,key);
			//Test for ok
			test.end();
		} catch (error) {
			console.error(error);
			//Should not get here
			test.fail();
		}
	});
	suite.end();
	//delete temp files and dir
	FS.unlinkSync(crt);
	FS.unlinkSync(key);
	FS.rmdir(tmp,()=>{});
})
]).then(()=>MediaServer.terminate ());

