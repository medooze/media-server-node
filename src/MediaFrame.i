%{
#include "media.h"
using MediaFrameListener = MediaFrame::Listener;
using MediaFrameProducer = MediaFrame::Producer;
using MediaFrameType = MediaFrame::Type;
%}

%nodefaultctor MediaFrameListener;
%nodefaultdtor MediaFrameListener;
struct MediaFrameListener
{
};

SHARED_PTR(MediaFrameListener)


%nodefaultctor MediaFrameProducer;
%nodefaultdtor MediaFrameProducer;
struct MediaFrameProducer
{
	void AddMediaListener(const MediaFrameListenerShared& listener);
	void RemoveMediaListener(const MediaFrameListenerShared& listener);
};

SHARED_PTR(MediaFrameProducer)

enum MediaFrameType;