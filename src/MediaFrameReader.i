
%include "MediaFrame.i"

%{

#include "codecs.h"
//#include "h264/h264.h"
#include "h264/H26xNal.h"

class MediaFrameReader :
	public MediaFrame::Listener
{

public:
	MediaFrameReader(v8::Local<v8::Object> object,bool intraOnly, uint32_t minPeriod, bool onDemand)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
		this->intraOnly = intraOnly;
		this->minPeriod = minPeriod;
		this->onDemand = onDemand;
	}
		
	virtual ~MediaFrameReader() = default;

	virtual void onMediaFrame(const MediaFrame &frame) override
	{
		onMediaFrame(0, frame);
	}

	virtual void onMediaFrame(DWORD ssrc, const MediaFrame &frame)
	{
		//UltraDebug("-onMediaFrame() [minPeriod:%d,lastFrame:%lld]\n",minPeriod,lastFrame);

		if (intraOnly && frame.GetType()==MediaFrame::Video && !((VideoFrame*)&frame)->IsIntra())
			//Ignore non intra video frames
			return;

		//Get timestamp
		uint64_t now = getTimeMS();

		if (onDemand && !grabNextFrame)
			//Ignore non requested frames when on demand mode
			return;

		if (minPeriod && now < lastFrame + minPeriod)
			//Ignore frame before min perior
			return;

		//Update last frame time
		lastFrame = now;

		//Get media typ
		const char* type = MediaFrame::TypeToString(frame.GetType());
		const char* codec =  frame.GetType()==MediaFrame::Video 
					? VideoCodec::GetNameFor(((VideoFrame*)&frame)->GetCodec())
					: AudioCodec::GetNameFor(((AudioFrame*)&frame)->GetCodec());
		//Got frame, reset flag
		grabNextFrame = false;

		//Get frame buffer
		Buffer::shared buffer = frame.GetBuffer();

		UltraDebug("-onMediaFrame() [type:%s,codec:%s,minPeriod:%d,lastFrame:%d]\n",type,codec,minPeriod,lastFrame);
        UltraDebug("ttxgz: %s, line %d\n", __PRETTY_FUNCTION__, __LINE__);

		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[3];
			//Create buffer
			v8::Local<v8::Value> frame = Nan::CopyBuffer(reinterpret_cast<const char*>(buffer->GetData()), buffer->GetSize()).ToLocalChecked();
			
			//If is h264
			if (strcasecmp(codec,"H264")==0)
			{
                UltraDebug("ttxgz: %s, line %d\n", __PRETTY_FUNCTION__, __LINE__);
				//Convert to Uint8Array
				v8::Local<v8::Uint8Array> uint8array = frame.As<v8::Uint8Array>();
				//Convert to annexB
				NalToAnnexB((uint8_t*)uint8array->Buffer()->GetBackingStore()->Data(), uint8array->Buffer()->ByteLength());
			}
			//If is h265
			if (strcasecmp(codec,"H265")==0)
			{
                UltraDebug("ttxgz: %s, line %d\n", __PRETTY_FUNCTION__, __LINE__);
				//Convert to Uint8Array
				v8::Local<v8::Uint8Array> uint8array = frame.As<v8::Uint8Array>();
				//Convert to annexB
				NalToAnnexB((uint8_t*)uint8array->Buffer()->GetBackingStore()->Data(), uint8array->Buffer()->ByteLength());
			}
			//Create local args
			argv[i++] = frame;
			argv[i++] = Nan::New(type).ToLocalChecked();
			argv[i++] = Nan::New(codec).ToLocalChecked();

			
			//Call object method with arguments
			MakeCallback(cloned, "onframe", i, argv);
		});
	}

	void GrabNextFrame()
	{
		grabNextFrame = true;
	}
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
	bool intraOnly = false;
	uint32_t minPeriod = 0;
	uint64_t lastFrame = 0;
	bool grabNextFrame = false;
	bool onDemand = false;
};
%}

%nodefaultctor MediaFrameReader;
%nodefaultdtor MediaFrameReader;
class MediaFrameReader 
{
public:
	void GrabNextFrame();
};

SHARED_PTR_BEGIN(MediaFrameReader)
{
	MediaFrameReaderShared(v8::Local<v8::Object> object,bool intraOnly,  uint32_t minPeriod, bool onDemand)
	{
		return new std::shared_ptr<MediaFrameReader>(new MediaFrameReader(object,intraOnly,minPeriod,onDemand));
	}
	
	SHARED_PTR_TO(MediaFrameListener)
}
SHARED_PTR_END(MediaFrameReader)

