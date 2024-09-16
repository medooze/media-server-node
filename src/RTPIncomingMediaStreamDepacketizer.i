%{
#include "rtp/RTPIncomingMediaStreamDepacketizer.h"
%}

%include "RTPIncomingMediaStream.i"
%include "MediaFrame.i"

class RTPIncomingMediaStreamDepacketizer :
	public MediaFrameProducer
{
private:
	RTPIncomingMediaStreamDepacketizer();

public:
	//RTPIncomingMediaStreamDepacketizer(const RTPIncomingMediaStreamShared& incomingSource);
	void Stop();
};


SHARED_PTR_BEGIN(RTPIncomingMediaStreamDepacketizer)
{
	RTPIncomingMediaStreamDepacketizerShared(const RTPIncomingMediaStreamShared& incomingSource)
	{
		return new std::shared_ptr<RTPIncomingMediaStreamDepacketizer>(RTPIncomingMediaStreamDepacketizer::Create(incomingSource));
	}
	SHARED_PTR_TO(MediaFrameProducer)
}
SHARED_PTR_END(RTPIncomingMediaStreamDepacketizer)