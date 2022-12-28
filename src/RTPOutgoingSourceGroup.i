%include "shared_ptr.i"
%include "EventLoop.i"
%include "MediaFrame.i"
%include "RTPOutgoingSource.i"

struct RTPOutgoingSourceGroup
{
	RTPOutgoingSourceGroup(MediaFrameType type, TimeService& TimeService);
	RTPOutgoingSourceGroup(const std::string &streamId,MediaFrameType type, TimeService& TimeService);
	
	MediaFrameType  type;
	const RTPOutgoingSource media;
	const RTPOutgoingSource rtx;
	QWORD lastUpdated;

	void Update();
	void Stop();
};

SHARED_PTR_BEGIN(RTPOutgoingSourceGroup)
{
	RTPOutgoingSourceGroupShared(MediaFrameType type, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPOutgoingSourceGroup>(new RTPOutgoingSourceGroup(type,TimeService));
	}

	RTPOutgoingSourceGroupShared(const std::string &streamId,MediaFrameType type, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPOutgoingSourceGroup>(new RTPOutgoingSourceGroup(streamId,type,TimeService));
	}

}
SHARED_PTR_END(RTPOutgoingSourceGroup)
