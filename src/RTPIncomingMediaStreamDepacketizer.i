class RTPIncomingMediaStreamDepacketizer 
{
public:
	RTPIncomingMediaStreamDepacketizer(const RTPIncomingMediaStreamShared& incomingSource);
	void AddMediaListener(MediaFrameListener* listener);
	void RemoveMediaListener(MediaFrameListener* listener);
	void Stop();
};