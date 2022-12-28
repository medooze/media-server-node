%{
#include "media.h"
using MediaFrameListener = MediaFrame::Listener;
using MediaFrameType = MediaFrame::Type;
%}

%nodefaultctor MediaFrameListener;
%nodefaultdtor MediaFrameListener;
struct MediaFrameListener
{
};

SHARED_PTR(MediaFrameListener)

enum MediaFrameType;