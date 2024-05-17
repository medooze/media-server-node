%include "MediaServer.i"

%{

class DataChannelMessageListener :
	public datachannels::MessageListener
{
public:
	DataChannelMessageListener(v8::Local<v8::Object> object)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}
		
	virtual ~DataChannelMessageListener() = default;
	
	
	virtual void OnMessage(const std::shared_ptr<datachannels::Message>& message) override
	{
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			
			//Create buffer
			v8::Local<v8::Value> msg = Nan::CopyBuffer(reinterpret_cast<const char*>(message->data.data()), message->data.size()).ToLocalChecked();

			//Create local args
			v8::Local<v8::Value> argv[1] = {
				msg
			};
			
			//Call object method with arguments
			MakeCallback(cloned, "ondatachannelmessage", 1, argv);
		});
	}

private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};
%}

class DataChannelMessageListener
{
public:
	DataChannelMessageListener(v8::Local<v8::Object> object);
};


SHARED_PTR_BEGIN(DataChannelMessageListener)
{
	DataChannelMessageListenerShared(v8::Local<v8::Object> object)
	{
		return new std::shared_ptr<DataChannelMessageListener>(new DataChannelMessageListener(object));
	}
}
SHARED_PTR_END(DataChannelMessageListener)