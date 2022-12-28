%{
#include "rtp/RTPIncomingMediaStreamDepacketizer.h"
%}

%include "RTPIncomingMediaStream.i"
%include "MediaFrame.i"

class RTPIncomingMediaStreamDepacketizer 
{
public:
	RTPIncomingMediaStreamDepacketizer(const RTPIncomingMediaStreamShared& incomingSource);
	void AddMediaListener(const MediaFrameListenerShared& listener);
	void RemoveMediaListener(const MediaFrameListenerShared& listener);
	void Stop();
};