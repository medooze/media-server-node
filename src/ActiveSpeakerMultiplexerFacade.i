%include "MediaServer.i"
%include "EventLoop.i"
%include "RTPIncomingMediaStream.i"
%include "RTPStreamTransponderFacade.i"

%{
class ActiveSpeakerMultiplexerFacade :
	public ActiveSpeakerMultiplexer,
	public ActiveSpeakerMultiplexer::Listener
{
private:
	ActiveSpeakerMultiplexerFacade(TimeService& timeService,v8::Local<v8::Object> object) :
		ActiveSpeakerMultiplexer(timeService,this)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}

public:
	static std::shared_ptr<ActiveSpeakerMultiplexerFacade> Create(TimeService& timeService,v8::Local<v8::Object> object)
	{
		auto obj = std::shared_ptr<ActiveSpeakerMultiplexerFacade>(new ActiveSpeakerMultiplexerFacade(timeService, object));
		obj->OnCreated();
		return obj;
	}
		
	virtual void onActiveSpeakerChanged(uint32_t speakerId,uint32_t multiplexerId) override
	{
		UltraDebug("-ActiveSpeakerMultiplexerFacade::onActiveSpeakerChanged() [speakerId:%d,multiplexerId:%d]\n",speakerId,multiplexerId);
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[2];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>(speakerId);
			argv[i++] = Nan::New<v8::Uint32>(multiplexerId);
			//Call object method with arguments
			MakeCallback(cloned, "onactivespeakerchanged", i, argv);
		});
	}

	virtual void onActiveSpeakerRemoved(uint32_t multiplexerId) override
	{
		UltraDebug("-ActiveSpeakerMultiplexerFacade::onActiveSpeakerRemoved() [multiplexerId:%d]\n",multiplexerId);
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>(multiplexerId);
			//Call object method with arguments
			MakeCallback(cloned, "onactivespeakerremoved", i, argv);
		});
	}
	
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};

%}


%nodefaultctor ActiveSpeakerMultiplexerFacade;
class ActiveSpeakerMultiplexerFacade 
{
public:	
	static std::shared_ptr<ActiveSpeakerMultiplexerFacade> Create(TimeService& timeService,v8::Local<v8::Object> object);
	
	void SetMaxAccumulatedScore(uint64_t maxAcummulatedScore);
	void SetNoiseGatingThreshold(uint8_t noiseGatingThreshold);
	void SetMinActivationScore(uint32_t minActivationScore);
	void AddIncomingSourceGroup(const RTPIncomingMediaStreamShared& incoming, uint32_t id);
	void RemoveIncomingSourceGroup(const RTPIncomingMediaStreamShared& incoming);
	void AddRTPStreamTransponder(RTPStreamTransponder* transpoder, uint32_t id);
	void RemoveRTPStreamTransponder(RTPStreamTransponder* transpoder);
	void Stop();
};

SHARED_PTR_BEGIN(ActiveSpeakerMultiplexerFacade)
{
	ActiveSpeakerMultiplexerFacadeShared(TimeService& timeService, v8::Local<v8::Object> object)
	{
		return new std::shared_ptr<ActiveSpeakerMultiplexerFacade>(ActiveSpeakerMultiplexerFacade::Create(timeService, object));
	}
}
SHARED_PTR_END(ActiveSpeakerMultiplexerFacade)

