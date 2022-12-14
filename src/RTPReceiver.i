%include "shared_ptr.i"

%nodefaultctor RTPReceiver;
%nodefaultdtor RTPReceiver; 
struct RTPReceiver
{
	int SendPLI(DWORD ssrc);
	int Reset(DWORD ssrc);
};


SHARED_PTR(RTPReceiver)