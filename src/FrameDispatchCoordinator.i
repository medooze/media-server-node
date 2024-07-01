%{
#include "FrameDispatchCoordinator.h"
%}

class FrameDispatchCoordinator
{
public:

%extend
{
	void SetMaxDelayMs(uint32_t maxDelayMs)
	{
		self->SetMaxDelayMs(std::chrono::milliseconds(maxDelayMs));
	}
}
};

SHARED_PTR_BEGIN(FrameDispatchCoordinator)
{
	FrameDispatchCoordinatorShared(int aUpdateRefsPacketLateThresholdMs, int aUpdateRefsStepPacketEarlyMs)
	{
		return new std::shared_ptr<FrameDispatchCoordinator>(
			new FrameDispatchCoordinator(aUpdateRefsPacketLateThresholdMs, 
							std::chrono::milliseconds(aUpdateRefsStepPacketEarlyMs)));
	}

	FrameDispatchCoordinatorShared()
	{
		return new std::shared_ptr<FrameDispatchCoordinator>(new FrameDispatchCoordinator());
	}
}
SHARED_PTR_END(FrameDispatchCoordinator)
