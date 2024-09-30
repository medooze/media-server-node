
%include "shared_ptr.i"

%include "RTPIncomingMediaStream.i"
%include "RTPIncomingSource.i"

%nodefaultctor RTPIncomingMediaStreamMultiplexer;
struct RTPIncomingMediaStreamMultiplexer : public RTPIncomingMediaStream, public RTPIncomingMediaStreamListener
{
	void Stop();
};

SHARED_PTR_BEGIN(RTPIncomingMediaStreamMultiplexer)
{
	RTPIncomingMediaStreamMultiplexerShared(const RTPIncomingMediaStreamShared& incomingMediaStream, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPIncomingMediaStreamMultiplexer>(RTPIncomingMediaStreamMultiplexer::Create(incomingMediaStream,TimeService));
	}
	SHARED_PTR_TO(RTPIncomingMediaStream)
}
SHARED_PTR_END(RTPIncomingMediaStreamMultiplexer)
