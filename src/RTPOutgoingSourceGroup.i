%include "shared_ptr.i"
%include "EventLoop.i"
%include "MediaFrame.i"
%include "RTPOutgoingSource.i"

%nodefaultctor RTPOutgoingSourceGroup;
struct RTPOutgoingSourceGroup
{
public:
	static RTPOutgoingSourceGroupShared Create(MediaFrameType type, TimeService& TimeService);
	static RTPOutgoingSourceGroupShared Create(const std::string &streamId,MediaFrameType type, TimeService& TimeService);
	
	MediaFrameType  type;
	std::string rid;
	std::string mid;
	const RTPOutgoingSource media;
	const RTPOutgoingSource fec;
	const RTPOutgoingSource rtx;
	QWORD lastUpdated;

	void Update();
	void Stop();
	void SetForcedPlayoutDelay(uint16_t min, uint16_t max);

%extend {
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

SHARED_PTR_BEGIN(RTPOutgoingSourceGroup)
{
	RTPOutgoingSourceGroupShared(MediaFrameType type, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPOutgoingSourceGroup>(RTPOutgoingSourceGroup::Create(type,TimeService));
	}

	RTPOutgoingSourceGroupShared(const std::string &streamId,MediaFrameType type, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPOutgoingSourceGroup>(RTPOutgoingSourceGroup::Create(streamId,type,TimeService));
	}

}
SHARED_PTR_END(RTPOutgoingSourceGroup)
