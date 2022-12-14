
%include "shared_ptr.i"

%include "RTPIncomingMediaStream.i"
%include "RTPIncomingSource.i"

struct RTPIncomingMediaStreamMultiplexer : public RTPIncomingMediaStream, public RTPIncomingMediaStreamListener
{
	RTPIncomingMediaStreamMultiplexer(const RTPIncomingMediaStreamShared& incomingMediaStream, TimeService& TimeService);
	void Stop();
};

SHARED_PTR_BEGIN(RTPIncomingMediaStreamMultiplexer)
{
	RTPIncomingMediaStreamMultiplexerShared(const RTPIncomingMediaStreamShared& incomingMediaStream, TimeService& TimeService)
	{
		return new std::shared_ptr<RTPIncomingMediaStreamMultiplexer>(new RTPIncomingMediaStreamMultiplexer(incomingMediaStream,TimeService));
	}
	SHARED_PTR_TO(RTPIncomingMediaStream)
}
SHARED_PTR_END(RTPIncomingMediaStreamMultiplexer)
