%include "RTPSource.i"

struct RTPOutgoingSource : public RTPSource
{
	DWORD time;
	DWORD numFrames;
	DWORD numFramesDelta;
	DWORD lastTimestamp;
	QWORD lastSenderReport;
	QWORD lastSenderReportNTP;
	DWORD remb;
	DWORD reportCount;
	DWORD reportCountDelta;
	DWORD reportedLostCount;
	DWORD reportedLostCountDelta;
	BYTE  reportedFractionLost;
	DWORD reportedJitter;
	DWORD rtt;
};