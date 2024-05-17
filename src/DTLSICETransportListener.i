%include "MediaServer.i"

%{

class DTLSICETransportListener :
	public DTLSICETransport::Listener
{
public:
	DTLSICETransportListener(v8::Local<v8::Object> object)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}
		
	virtual ~DTLSICETransportListener() = default;
	
	virtual void onRemoteICECandidateActivated(const std::string& ip, uint16_t port, uint32_t priority) override
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[3];
			//Create local args
			argv[i++] = Nan::New(ip).ToLocalChecked();
			argv[i++] = Nan::New<v8::Uint32>(port);
			argv[i++] = Nan::New<v8::Uint32>(priority);
			//Call object method with arguments
			MakeCallback(cloned, "onremoteicecandidate", i, argv);
		});
	}
	
	virtual void onDTLSStateChanged(const DTLSICETransport::DTLSState state) override 
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];

			switch(state)
			{
				case DTLSICETransport::DTLSState::New:
					//Create local args
					argv[i++] = Nan::New("new").ToLocalChecked();
					break;
				case DTLSICETransport::DTLSState::Connecting:
					//Create local args
					argv[i++] = Nan::New("connecting").ToLocalChecked();
					break;
				case DTLSICETransport::DTLSState::Connected:
					//Create local args
					argv[i++] = Nan::New("connected").ToLocalChecked();
					break;
				case DTLSICETransport::DTLSState::Closed:
					//Create local args
					argv[i++] = Nan::New("closed").ToLocalChecked();
					break;
				case DTLSICETransport::DTLSState::Failed:
					//Create local args
					argv[i++] = Nan::New("failed").ToLocalChecked();
					break;
			}
			//Call method
			MakeCallback(cloned,"ondtlsstate",i,argv);
		});
	}
	
	virtual void onICETimeout() override 
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			//Call object method with arguments
			MakeCallback(cloned, "onicetimeout");
		});
	}
	
	virtual void onDataChannelCreated(const datachannels::DataChannel::shared& dataChannel) override
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
			MakeCallback(cloned, "ondatachannel", 1, argv);
		});
	}

private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};
%}

class DTLSICETransportListener
{
public:
	DTLSICETransportListener(v8::Local<v8::Object> object);
};


SHARED_PTR_BEGIN(DTLSICETransportListener)
{
	DTLSICETransportListenerShared(v8::Local<v8::Object> object)
	{
		return new std::shared_ptr<DTLSICETransportListener>(new DTLSICETransportListener(object));
	}
}
SHARED_PTR_END(DTLSICETransportListener)