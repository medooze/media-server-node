%include "MediaFrame.i"
%include "EventLoop.i"

%nodefaultctor SimulcastMediaFrameListener;
class SimulcastMediaFrameListener :
	public MediaFrameProducer,
	public MediaFrameListener
{
public:
	void SetNumLayers(DWORD numLayers);
	void AttachTo(const MediaFrameProducerShared& producer);
	void Detach(const MediaFrameProducerShared& producer);
	void Stop();
	//From MediaFrameProducer
	void AddMediaListener(const MediaFrameListenerShared& listener);
	void RemoveMediaListener(const MediaFrameListenerShared& listener);
};


SHARED_PTR_BEGIN(SimulcastMediaFrameListener)
{
	SimulcastMediaFrameListenerShared(TimeService &timeService, DWORD ssrc, DWORD numLayers)
	{
		return new std::shared_ptr<SimulcastMediaFrameListener>(SimulcastMediaFrameListener::Create(timeService,ssrc,numLayers));
	}
	SHARED_PTR_TO(MediaFrameListener)
	SHARED_PTR_TO(MediaFrameProducer)
}
SHARED_PTR_END(SimulcastMediaFrameListener)