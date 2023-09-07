struct LayerInfo
{
	static BYTE MaxLayerId; 
	BYTE temporalLayerId = MaxLayerId;
	BYTE spatialLayerId  = MaxLayerId;

	std::optional<uint16_t> targetBitrate;
	std::optional<uint16_t> targetWidth;
	std::optional<uint16_t> targetHeight;
	std::optional<uint8_t>  targetFps;
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
	DWORD		numPackets;
	QWORD		totalBytes;
	DWORD		bitrate;
};

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
	DWORD clockrate;
};