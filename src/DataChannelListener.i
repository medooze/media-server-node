%include "MediaServer.i"

%{

class DataChannelListener :
	public datachannels::MessageListener
{
public:
	DataChannelListener(v8::Local<v8::Object> object)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}
		
	virtual ~DataChannelListener() = default;
	
	
	virtual void OnMessage(const std::shared_ptr<datachannels::Message>& message) override
	{
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			
			//Create buffer
			v8::Local<v8::Value> frame = Nan::CopyBuffer(reinterpret_cast<const char*>(message->data.data()), message->data.size()).ToLocalChecked();

			//Create local args
			v8::Local<v8::Value> argv[1] = {
				frame
			};
			
			//Call object method with arguments
			MakeCallback(cloned, "ondata", 1, argv);
		});
	}

private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};
%}

class DataChannelListener
{
public:
	DataChannelListener(v8::Local<v8::Object> object);
};


SHARED_PTR_BEGIN(DataChannelListener)
{
	DataChannelListenerShared(v8::Local<v8::Object> object)
	{
		return new std::shared_ptr<DataChannelListener>(new DataChannelListener(object));
	}
}
SHARED_PTR_END(DataChannelListener)