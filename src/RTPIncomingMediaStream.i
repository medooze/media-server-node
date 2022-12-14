%include "shared_ptr.i"

%{
using RTPIncomingMediaStreamListener = RTPIncomingMediaStream::Listener;
%}
%nodefaultctor RTPIncomingMediaStreamListener;
struct RTPIncomingMediaStreamListener
{
};

%nodefaultctor RTPIncomingMediaStream;
%nodefaultdtor RTPIncomingMediaStream; 
struct RTPIncomingMediaStream 
{
	DWORD GetMediaSSRC();
	TimeService& GetTimeService();

	void AddListener(RTPIncomingMediaStreamListener* listener);
	void RemoveListener(RTPIncomingMediaStreamListener* listener);
	void Mute(bool muting);
};

SHARED_PTR(RTPIncomingMediaStream)

