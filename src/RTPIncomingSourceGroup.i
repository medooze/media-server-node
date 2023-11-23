%include "shared_ptr.i"
%include "MediaServer.i"
%include "MediaFrame.i"
%include "RTPIncomingMediaStream.i"
%include "RTPIncomingSource.i"


struct RTPIncomingSourceGroup : public RTPIncomingMediaStream
{
	RTPIncomingSourceGroup(MediaFrameType type, TimeService& TimeService);
	std::string rid;
	std::string mid;
	DWORD rtt;
	MediaFrameType  type;
	const RTPIncomingSource media;
	const RTPIncomingSource rtx;
	DWORD lost;
	DWORD minWaitedTime;
	DWORD maxWaitedTime;
	double avgWaitedTime;
	QWORD lastUpdated;
	DWORD codec;
	
	void SetMaxWaitTime(DWORD maxWaitingTime);
	void ResetMaxWaitTime();
	void Update();
	
	void Stop();

%extend {
	void UpdateAsync(v8::Local<v8::Object> object)
	{
		auto persistent = std::make_shared<Persistent<v8::Object>>(object);
		self->UpdateAsync([=](std::chrono::milliseconds){
			MediaServer::Async([=](){
				Nan::HandleScope scope;
				int i = 0;
				v8::Local<v8::Value> argv[0];
				//Call object method with arguments
				MakeCallback(persistent, "resolve", i, argv);
			});
		});
	}
}
};


SHARED_PTR_BEGIN(RTPIncomingSourceGroup)
{
	RTPIncomingSourceGroupShared(MediaFrameType type, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPIncomingSourceGroup>(new RTPIncomingSourceGroup(type,TimeService));
	}
	SHARED_PTR_TO(RTPIncomingMediaStream)
}
SHARED_PTR_END(RTPIncomingSourceGroup)
