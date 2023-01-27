%include "MediaServer.i"

%{
class SenderSideEstimatorListener : 
	public RemoteRateEstimator::Listener
{
public:
	SenderSideEstimatorListener(v8::Local<v8::Object> object)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}
	
	virtual void onTargetBitrateRequested(DWORD bitrate, DWORD bandwidthEstimation, DWORD totalBitrate)
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[3];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>(bitrate);
			argv[i++] = Nan::New<v8::Uint32>(bandwidthEstimation);
			argv[i++] = Nan::New<v8::Uint32>(totalBitrate);
			//Call object method with arguments
			MakeCallback(cloned, "ontargetbitrate", i, argv);
		
		});
	}
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};
%}

class SenderSideEstimatorListener :
	public RemoteRateEstimatorListener
{
public:
	SenderSideEstimatorListener(v8::Local<v8::Object> object);
};
