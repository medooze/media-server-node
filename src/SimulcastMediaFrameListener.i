%include "MediaFrame.i"
%include "EventLoop.i"

class SimulcastMediaFrameListener :
	public MediaFrameListener
{
public:
	SimulcastMediaFrameListener(TimeService &timeService, DWORD ssrc, DWORD numLayers);
	void SetNumLayers(DWORD numLayers);
	void AddMediaListener(const MediaFrameListenerShared& listener);
	void RemoveMediaListener(const MediaFrameListenerShared listener);
	void Stop();
};


SHARED_PTR_BEGIN(SimulcastMediaFrameListener)
{
	SimulcastMediaFrameListenerShared(TimeService &timeService, DWORD ssrc, DWORD numLayers)
	{
		return new std::shared_ptr<SimulcastMediaFrameListener>(new SimulcastMediaFrameListener(timeService,ssrc,numLayers));
	}
	SHARED_PTR_TO(MediaFrameListener)
}
SHARED_PTR_END(SimulcastMediaFrameListener)