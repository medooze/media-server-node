%{
#include "FrameDispatchCoordinator.h"
%}

class FrameDispatchCoordinator
{
public:
	
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
