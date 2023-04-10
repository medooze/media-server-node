%{
#include "rtp/RTPIncomingMediaStreamDepacketizer.h"
%}

%include "RTPIncomingMediaStream.i"
%include "MediaFrame.i"

class RTPIncomingMediaStreamDepacketizer :
	public MediaFrameProducer
{
public:
	RTPIncomingMediaStreamDepacketizer(const RTPIncomingMediaStreamShared& incomingSource);
	void Stop();
};


SHARED_PTR_BEGIN(RTPIncomingMediaStreamDepacketizer)
{
	RTPIncomingMediaStreamDepacketizerShared(const RTPIncomingMediaStreamShared& incomingSource)
	{
		return new std::shared_ptr<RTPIncomingMediaStreamDepacketizer>(new RTPIncomingMediaStreamDepacketizer(incomingSource));
	}
	SHARED_PTR_TO(MediaFrameProducer)
}
SHARED_PTR_END(RTPIncomingMediaStreamDepacketizer)