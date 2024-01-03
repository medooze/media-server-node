struct LayerInfo
{
	static BYTE MaxLayerId; 
	BYTE temporalLayerId = MaxLayerId;
	BYTE spatialLayerId  = MaxLayerId;
};

%{
class LayerSources : public std::vector<LayerSource*>
{
public:
	size_t size() const		{ return std::vector<LayerSource*>::size(); }
	LayerSource* get(size_t i)	{ return  std::vector<LayerSource*>::at(i); }
};
%}

struct LayerSource : public LayerInfo
{
	DWORD numPackets;
	QWORD totalBytes;
	DWORD bitrate;
	DWORD totalBitrate;

	bool  active;

	%extend 
	{
		const int64_t targetBitrate;
		const int64_t targetWidth;
		const int64_t targetHeight;
		const int64_t targetFps;
	}
};
%{
int64_t LayerSource_targetBitrate_get(LayerSource* self)	{ return self->targetBitrate.value_or(0);	} 
int64_t LayerSource_targetWidth_get(LayerSource* self)		{ return self->targetWidth.value_or(0);		} 
int64_t LayerSource_targetHeight_get(LayerSource* self)		{ return self->targetHeight.value_or(0);	} 
int64_t LayerSource_targetFps_get(LayerSource* self)		{ return self->targetFps.value_or(0);		} 
%}

class LayerSources
{
public:
	size_t size() const;
	LayerSource* get(size_t i);
};

struct RTPSource 
{
	DWORD ssrc;
	DWORD extSeqNum;
	DWORD cycles;
	DWORD jitter;
	DWORD numPackets;
	DWORD numPacketsDelta;
	DWORD numRTCPPackets;
	QWORD totalBytes;
	QWORD totalRTCPBytes;
	DWORD bitrate;
	DWORD totalBitrate;
	DWORD clockrate;
};
