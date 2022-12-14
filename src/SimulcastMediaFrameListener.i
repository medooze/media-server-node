class SimulcastMediaFrameListener :
	public MediaFrameListener
{
public:
	SimulcastMediaFrameListener(TimeService &timeService, DWORD ssrc, DWORD numLayers);
	void SetNumLayers(DWORD numLayers);
	void AddMediaListener(MediaFrameListener* listener);
	void RemoveMediaListener(MediaFrameListener* listener);
	void Stop();
};