%include "RTPSource.i"

struct RTPIncomingSource : public RTPSource
{
	DWORD numFrames;
	DWORD numFramesDelta;
	DWORD lostPackets;
	DWORD lostPacketsDelta;
	DWORD lostPacketsMaxGap;
	DWORD lostPacketsGapCount;
	DWORD dropPackets;
	DWORD totalPacketsSinceLastSR;
	DWORD totalBytesSinceLastSR;
	DWORD minExtSeqNumSinceLastSR ;
	DWORD lostPacketsSinceLastSR;
	QWORD lastReceivedSenderNTPTimestamp;
	QWORD lastReceivedSenderReport;
	QWORD lastReport;
	DWORD totalPLIs;
	DWORD totalNACKs;

	int64_t frameDelay;
	int64_t frameDelayMax;
	int32_t frameCaptureDelay;
	int32_t frameCaptureDelayMax;

	int64_t skew;
	double  drift;
	bool	aggregatedLayers;

	uint16_t width;
	uint16_t height;
	
	%extend 
	{
		LayerSources layers() 
		{
			LayerSources layers;
			for(auto it = $self->layers.begin(); it != $self->layers.end(); ++it )
				layers.push_back(&(it->second));
			return layers;
		}
		const int64_t targetBitrate;
		const int64_t targetWidth;
		const int64_t targetHeight;
		const int64_t targetFps;
	}
};
%{
int64_t RTPIncomingSource_targetBitrate_get(RTPIncomingSource* self)	{ return self->value_or(0); } 
int64_t RTPIncomingSource_targetWidth_get(RTPIncomingSource* self)	{ return self->value_or(0); }  
int64_t RTPIncomingSource_targetHeight_get(RTPIncomingSource* self)	{ return self->value_or(0); } 
int64_t RTPIncomingSource_targetFps_get(RTPIncomingSource* self)	{ return self->value_or(0); }  
%}
