%include "shared_ptr.i"

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
	
	void SetMaxWaitTime(DWORD maxWaitingTime);
	void ResetMaxWaitTime();
	void Update();
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
