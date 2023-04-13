%include "MediaFrame.i"
%include "EventLoop.i"

class SimulcastMediaFrameListener :
	public MediaFrameProducer,
	public MediaFrameListener
{
public:
	SimulcastMediaFrameListener(TimeService &timeService, DWORD ssrc, DWORD numLayers);
	void SetNumLayers(DWORD numLayers);
	void AttachTo(const MediaFrameProducerShared& producer);
	void Detach(const MediaFrameProducerShared& producer);
	void Stop();
};


SHARED_PTR_BEGIN(SimulcastMediaFrameListener)
{
	SimulcastMediaFrameListenerShared(TimeService &timeService, DWORD ssrc, DWORD numLayers)
	{
		return new std::shared_ptr<SimulcastMediaFrameListener>(new SimulcastMediaFrameListener(timeService,ssrc,numLayers));
	}
	SHARED_PTR_TO(MediaFrameListener)
	SHARED_PTR_TO(MediaFrameProducer)
}
SHARED_PTR_END(SimulcastMediaFrameListener)