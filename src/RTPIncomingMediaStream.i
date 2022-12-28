%{
#include "rtp/RTPIncomingMediaStream.h"
%}

%include "shared_ptr.i"
%include "EventLoop.i"

%nodefaultctor RTPIncomingMediaStream;
%nodefaultdtor RTPIncomingMediaStream; 
struct RTPIncomingMediaStream 
{
	DWORD GetMediaSSRC();
	TimeService& GetTimeService();

	void Mute(bool muting);
};

SHARED_PTR(RTPIncomingMediaStream)

