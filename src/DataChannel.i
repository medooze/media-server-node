%{
#include "Datachannels.h"
#include "Message.h"

using MessageListener = datachannels::MessageListener;
using MessageProducer = datachannels::MessageProducer;
using DataChannel = datachannels::DataChannel;
using MessageType = datachannels::MessageType;
using EnpointMode = datachannels::Endpoint::Mode;

%}

%include "DataChannelListener.i"
%include "DataChannelMessageListener.i"

enum MessageType;
enum EnpointMode;

%nodefaultctor MessageListener;
%nodefaultdtor MessageListener;
struct MessageListener
{
};

SHARED_PTR(MessageListener)

%nodefaultctor MessageProducer;
%nodefaultdtor MessageProducer;
struct MessageProducer
{
	void AddMessageListener(const MessageListenerShared& listener);
	void RemoveMessageListener(const MessageListenerShared& listener);
};

SHARED_PTR(MessageProducer)

%nodefaultctor DataChannel;
%nodefaultdtor DataChannel;
struct DataChannel
{
	void AddMessageListener(const DataChannelMessageListenerShared& listener);
	void RemoveMessageListener(const DataChannelMessageListenerShared& listener);
	
	void SetListener(const DataChannelListenerShared& listener);
	
	bool Close();
	
%extend {

	bool Send(v8::Local<v8::Object> obj)
	{
		if (obj->IsUint8Array())
		{
			auto buffer = v8::Local<v8::Uint8Array>::Cast(obj);
			
			auto msg = std::make_shared<datachannels::Message>();
			msg->type = buffer->Length() == 0 ? MessageType::WebRTCBinaryEmpty : MessageType::WebRTCBinary, 
			msg->data.resize(buffer->Length());
			
			buffer->CopyContents(msg->data.data(), msg->data.size());
			
			self->OnMessage(msg);
			
			return true;
		}
		else if(obj->IsString())
		{
			auto str = v8::Local<v8::String>::Cast(obj);
			auto len = str->Utf8Length(v8::Isolate::GetCurrent());
			
			auto msg = std::make_shared<datachannels::Message>();
			msg->type = len == 0 ? MessageType::WebRTCStringEmpty : MessageType::WebRTCString;
			msg->data.resize(len);
			
			str->WriteUtf8(v8::Isolate::GetCurrent(), (char*)msg->data.data(), len);
			
			self->OnMessage(msg);
			
			return true;
		}
		
		return false; 
	}
}

};

SHARED_PTR_BEGIN(DataChannel)
{
	SHARED_PTR_TO(MessageListener)
	SHARED_PTR_TO(MessageProducer)
}
SHARED_PTR_END(DataChannel)