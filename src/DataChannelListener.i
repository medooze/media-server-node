%include "MediaServer.i"

%{

class DataChannelListener :
	public datachannels::DataChannel::Listener
{
public:
	DataChannelListener(v8::Local<v8::Object> object)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}
		
	virtual ~DataChannelListener() = default;
	
	virtual void OnOpen(const datachannels::DataChannel::shared& dataChannel)
	{
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			//We create anothger shared pointer
			auto shared = new datachannels::DataChannel::shared(dataChannel);
			//Create local args
			v8::Local<v8::Value> argv[1] = {
				SWIG_NewPointerObj(SWIG_as_voidptr(shared), SWIGTYPE_p_DataChannelShared,SWIG_POINTER_OWN)
			};
			//Call object method with arguments
			MakeCallback(cloned, "onopen", 1, argv);
		});	
	}
			
	virtual void OnClosed(const datachannels::DataChannel::shared& dataChannel)
	{
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			//We create anothger shared pointer
			auto shared = new datachannels::DataChannel::shared(dataChannel);
			//Create local args
			v8::Local<v8::Value> argv[1] = {
				SWIG_NewPointerObj(SWIG_as_voidptr(shared), SWIGTYPE_p_DataChannelShared,SWIG_POINTER_OWN)
			};
			//Call object method with arguments
			MakeCallback(cloned, "onclose", 1, argv);
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