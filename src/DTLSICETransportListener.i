%include "MediaServer.i"

%{

class DTLSICETransportListener :
	public DTLSICETransport::Listener,
	public node::AsyncResource
{
public:
	DTLSICETransportListener(v8::Local<v8::Object> object) : 
		node::AsyncResource(v8::Isolate::GetCurrent(), object, "Medooze::DTLSICETransportListener")
	{
	}
		
	virtual ~DTLSICETransportListener() = default;
	
	virtual void onRemoteICECandidateActivated(const std::string& ip, uint16_t port, uint32_t priority) override
	{
		//Run function on main node thread
		CallInJs([=](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[3];
			//Create local args
			argv[i++] = Nan::New(ip).ToLocalChecked();
			argv[i++] = Nan::New<v8::Uint32>(port);
			argv[i++] = Nan::New<v8::Uint32>(priority);
			//Call object method with arguments
			this->MakeCallback("onremoteicecandidate", i, argv);
		});
	}
	
	virtual void onDTLSStateChanged(const DTLSICETransport::DTLSState state) override 
	{
		//Run function on main node thread
		CallInJs([=](){
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
			this->MakeCallback("ondtlsstate",i,argv);
		});
	}
	
	virtual void onICETimeout() override 
	{
		//Run function on main node thread
		CallInJs([=](){
			Nan::HandleScope scope;
			//Call object method with arguments
			this->MakeCallback("onicetimeout", 0, nullptr);
		});
	}
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
SHARED_PTR_END(DTLSICETransport)