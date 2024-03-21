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
	DWORD remoteBitrateEstimation;
	DWORD lost;
	DWORD minWaitedTime;
	DWORD maxWaitedTime;
	double avgWaitedTime;
	QWORD lastUpdated;
	
	void SetMaxWaitTime(DWORD maxWaitingTime);
	void ResetMaxWaitTime();
	void Update();
	
	void Stop();

%extend {
	// Note: Extra const on right of pointer to let SWIG know this only wants a get accessor
	char const * const codec;

	void UpdateAsync(v8::Local<v8::Object> object)
	{
		self->UpdateAsync([persistent = MediaServer::MakeSharedPersistent(object)](std::chrono::milliseconds){
			MediaServer::Async([persistent = std::move(persistent)](){
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

%{
	char const * const RTPIncomingSourceGroup_codec_get(RTPIncomingSourceGroup* self)	{ return GetNameForCodec(self->type, self->codec); } 
%}


SHARED_PTR_BEGIN(RTPIncomingSourceGroup)
{
	RTPIncomingSourceGroupShared(MediaFrameType type, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPIncomingSourceGroup>(new RTPIncomingSourceGroup(type,TimeService));
	}
	SHARED_PTR_TO(RTPIncomingMediaStream)
}
SHARED_PTR_END(RTPIncomingSourceGroup)
