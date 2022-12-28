%include "MediaServer.i"
%include "MediaFrame.i"

%{
class MP4RecorderFacade :
	public MP4Recorder,
	public MP4Recorder::Listener
{
public:
	MP4RecorderFacade(v8::Local<v8::Object> object) :
		MP4Recorder(this)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}

	void onFirstFrame(QWORD time) override
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>((uint32_t)time);
			//Call object method with arguments
			MakeCallback(cloned, "onstarted", i, argv);
		});
	}
	void onClosed() override 
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[0];
			//Call object method with arguments
			MakeCallback(cloned, "onclosed", i, argv);
		});
	}
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};

%}



class MP4RecorderFacade :
	public MediaFrameListener
{
public:
	MP4RecorderFacade(v8::Local<v8::Object> object);

	//Recorder interface
	bool Create(const char *filename);
	bool Record(bool waitVideo, bool disableHints);
	bool Stop();
	bool Close();
	void SetTimeShiftDuration(DWORD duration);
	bool SetH264ParameterSets(const std::string& sprops);
	bool Close(bool async);
};



SHARED_PTR_BEGIN(MP4RecorderFacade)
{
	MP4RecorderFacadeShared(v8::Local<v8::Object> object)
	{
		return new std::shared_ptr<MP4RecorderFacade>(new MP4RecorderFacade(object));
	}
	SHARED_PTR_TO(MediaFrameListener)
}
SHARED_PTR_END(MP4RecorderFacade)