%include "MediaServer.i"

%{
class ActiveSpeakerDetectorFacade :
	public ActiveSpeakerDetector,
	public ActiveSpeakerDetector::Listener,
	public RTPIncomingMediaStream::Listener
{
public:	
	ActiveSpeakerDetectorFacade(v8::Local<v8::Object> object) :
		ActiveSpeakerDetector(this)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	};
		
	virtual void onActiveSpeakerChanded(uint32_t id) override
	{
		UltraDebug("-ActiveSpeakerDetectorFacade::onActiveSpeakerChanded() [id:%d]\n",id);
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>(id);
			//Call object method with arguments
			MakeCallback(cloned, "onactivespeakerchanged", i, argv);
		});
	}
	
	void AddIncomingSourceGroup(RTPIncomingMediaStream* incoming, uint32_t id)
	{
		Debug("-ActiveSpeakerDetectorFacade::AddIncomingSourceGroup() [incoming:%p,id:%d]\n",incoming,id);
		
		if (incoming)
		{
			ScopedLock lock(mutex);
			//Insert new 
			auto [it,inserted] = sources.try_emplace(incoming,id);
			//If already present
			if (!inserted)
				//do nothing
				return;
			//Add us as rtp listeners
			incoming->AddListener(this);
			//initialize to silence
			ActiveSpeakerDetector::Accumulate(id, false, 127, getTimeMS());
		}
	}
	
	void RemoveIncomingSourceGroup(RTPIncomingMediaStream* incoming)
	{
		Debug("-ActiveSpeakerDetectorFacade::RemoveIncomingSourceGroup() [incoming:%p]\n",incoming);
		
		if (incoming)
		{	
			ScopedLock lock(mutex);
			//Get map
			auto it = sources.find(incoming);
			//check it was present
			if (it==sources.end())
				//Do nothing, probably called onEnded before
				return;
			//Remove listener
			incoming->RemoveListener(this);
			//RElease id
			ActiveSpeakerDetector::Release(it->second);
			//Erase
			sources.erase(it);
		}
	}
	
	virtual void onRTP(const RTPIncomingMediaStream* incoming,const RTPPacket::shared& packet) override
	{
		if (packet->HasAudioLevel())
		{
			ScopedLock lock(mutex);
			//Get map
			auto it = sources.find(incoming);
			//check it was present
			if (it==sources.end())
				//Do nothing
				return;
			//Accumulate on id
			ActiveSpeakerDetector::Accumulate(it->second, packet->GetVAD(),packet->GetLevel(), getTimeMS());
		}
	}
	
	virtual void onBye(const RTPIncomingMediaStream* group) override
	{
	}
	
	virtual void onEnded(const RTPIncomingMediaStream* incoming) override
	{
		Debug("-ActiveSpeakerDetectorFacade::onEnded() [incoming:%p]\n",incoming);
		
		if (incoming)
		{	
			ScopedLock lock(mutex);
			//Get map
			auto it = sources.find(incoming);
			//check it was present
			if (it==sources.end())
				//Do nothing
				return;
			//Release id
			ActiveSpeakerDetector::Release(it->second);
			//Erase
			sources.erase(it);
		}
	}
private:
	Mutex mutex;
	std::map<RTPIncomingMediaStream*,uint32_t,std::less<>> sources;
	std::shared_ptr<Persistent<v8::Object>> persistent;
};
%}

class ActiveSpeakerDetectorFacade
{
public:	
	ActiveSpeakerDetectorFacade(v8::Local<v8::Object> object);
	void SetMinChangePeriod(uint32_t minChangePeriod);
	void SetMaxAccumulatedScore(uint64_t maxAcummulatedScore);
	void SetNoiseGatingThreshold(uint8_t noiseGatingThreshold);
	void SetMinActivationScore(uint32_t minActivationScore);
	void AddIncomingSourceGroup(RTPIncomingMediaStream* incoming, uint32_t id);
	void RemoveIncomingSourceGroup(RTPIncomingMediaStream* incoming);
};
