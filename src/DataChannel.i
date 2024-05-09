%{
#include "Datachannels.h"
#include "Message.h"

using MessageListener = datachannels::MessageListener;
using MessageProducer = datachannels::MessageProducer;
using DataChannel = datachannels::DataChannel;
using MessageType = datachannels::MessageType;
using EnpointMode = datachannels::Endpoint::Mode;

%}

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
	bool Close();
	
%extend {

	bool Send(v8::Local<v8::ArrayBuffer> object)
	{
		return self->Send(datachannels::MessageType::Binary, static_cast<const uint8_t*>(object->Data()), object->ByteLength());
	}
	
	bool Send(datachannels::MessageType type, v8::Local<v8::String> str)
	{
		auto len = SWIGV8_UTF8_LENGTH(str);
		char buffer[len];
		SWIGV8_WRITE_UTF8(str, buffer, len);
		
		return self->Send(datachannels::MessageType::UTF8, reinterpret_cast<const uint8_t*>(buffer), len);
	}
}

};

SHARED_PTR(DataChannel)
