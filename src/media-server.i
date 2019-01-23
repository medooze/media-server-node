%module medooze
%{
	
#include <string>
#include <list>
#include <functional>
#include <nan.h>
#include "../media-server/include/config.h"	
#include "../media-server/include/dtls.h"
#include "../media-server/include/OpenSSL.h"
#include "../media-server/include/media.h"
#include "../media-server/include/rtp.h"
#include "../media-server/include/rtpsession.h"
#include "../media-server/include/DTLSICETransport.h"	
#include "../media-server/include/RTPBundleTransport.h"
#include "../media-server/include/PCAPTransportEmulator.h"	
#include "../media-server/include/mp4recorder.h"
#include "../media-server/include/mp4streamer.h"
#include "../media-server/src/vp9/VP9LayerSelector.h"
#include "../media-server/include/rtp/RTPStreamTransponder.h"
#include "../media-server/include/ActiveSpeakerDetector.h"	


class StringFacade : private std::string
{
public:
	StringFacade(const char* str) 
	{
		std::string::assign(str);
	}
	StringFacade(std::string &str) : std::string(str)
	{
		
	}
	const char* toString() 
	{
		return std::string::c_str();
	}
};

class PropertiesFacade : private Properties
{
public:
	void SetProperty(const char* key,int intval)
	{
		Properties::SetProperty(key,intval);
	}

	void SetProperty(const char* key,const char* val)
	{
		Properties::SetProperty(key,val);
	}
};



class MediaServer
{
public:
	typedef std::list<v8::Local<v8::Value>> Arguments;
public:
	static void RunCallback(v8::Handle<v8::Object> object) 
	{
		Arguments arguments;
		
		arguments.push_back(Nan::New<v8::Integer>(1));
		
		//Emit event
		MediaServer::Emit(object,arguments);
	}

	/*
	 * MakeCallback
	 *  Executes an object method async on the main node loop
	 */
	static void MakeCallback(v8::Handle<v8::Object> object, const char* method,Arguments& arguments)
	{
		// Create a copiable persistent
		Nan::Persistent<v8::Object>* persistent = new Nan::Persistent<v8::Object>(object);
		
		std::list<Nan::Persistent<v8::Value>*> pargs;
		for (auto it = arguments.begin(); it!= arguments.end(); ++it)
			pargs.push_back(new Nan::Persistent<v8::Value>(*it));
			
		
		//Run function on main node thread
		MediaServer::Async([=](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv2[pargs.size()];
			
			//Create local args
			for (auto it = pargs.begin(); it!= pargs.end(); ++it)
				argv2[i++] = Nan::New(*(*it));
			
			//Get a local reference
			v8::Local<v8::Object> local = Nan::New(*persistent);
			//Create callback function from object
			v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(local->Get(Nan::New(method).ToLocalChecked()));
			//Call object method with arguments
			Nan::MakeCallback(local, callback, i, argv2);
			//Release object
			delete(persistent);
			//Release args
			//TODO
		});
		
	}
	
	/*
	 * MakeCallback
	 *  Executes object "emit" method async on the main node loop
	 */
	static void Emit(v8::Handle<v8::Object> object,Arguments& arguments)
	{
		MediaServer::MakeCallback(object,"emit",arguments);
	}

	/*
	 * Async
	 *  Enqueus a function to the async queue and signals main thread to execute it
	 */
	static void Async(std::function<void()> func) 
	{
		//Lock
		mutex.Lock();
		//Enqueue
		queue.push_back(func);
		//Unlock
		mutex.Unlock();
		//Signal main thread
		uv_async_send(&async);
	}

	static void Initialize()
	{
		//Initialize ssl
		OpenSSL::ClassInit();
		
		//Start DTLS
		DTLSConnection::Initialize();
		
		//Init async handler
		uv_async_init(uv_default_loop(), &async, async_cb_handler);
	}
	
	static void Terminate()
	{
		uv_close((uv_handle_t *)&async, NULL);
	}
	
	static void EnableLog(bool flag)
	{
		//Enable log
		Log("-EnableLog [%d]\n",flag);
		Logger::EnableLog(flag);
		Log("-EnableLog [%d]\n",flag);
	}
	
	static void EnableDebug(bool flag)
	{
		//Enable debug
		Log("-EnableDebug [%d]\n",flag);
		Logger::EnableDebug(flag);
	}
	
	static void EnableUltraDebug(bool flag)
	{
		//Enable debug
		Log("-EnableUltraDebug [%d]\n",flag);
		Logger::EnableUltraDebug(flag);
	}
	
	static bool SetPortRange(int minPort, int maxPort)
	{
		return RTPTransport::SetPortRange(minPort,maxPort);
	}
	
	static StringFacade GetFingerprint()
	{
		return StringFacade(DTLSConnection::GetCertificateFingerPrint(DTLSConnection::Hash::SHA256).c_str());
	}

	static void async_cb_handler(uv_async_t *handle)
	{
		//Lock
		mutex.Lock();
		//Get all
		while(!queue.empty())
		{
			//Get from queue
			auto func = queue.front();
			//Remove from queue
			queue.pop_front();
			//Unlock
			mutex.Unlock();
			//Execute async function
			func();
			//Lock
			mutex.Lock();
		}
		//Unlock
		mutex.Unlock();
	}
private:
	//http://stackoverflow.com/questions/31207454/v8-multithreaded-function
	static uv_async_t  async;
	static Mutex mutex;
	static std::list<std::function<void()>> queue;
};

//Static initializaion
uv_async_t MediaServer::async;
Mutex MediaServer::mutex;
std::list<std::function<void()>>  MediaServer::queue;

class RTPSessionFacade : 	
	public RTPSender,
	public RTPReceiver,
	public RTPSession
{
public:
	RTPSessionFacade(MediaFrame::Type media) : RTPSession(media,NULL)
	{
		//Delegate to group
		delegate = true;
		//Start group dispatch
		GetIncomingSourceGroup()->Start();
	}
	virtual ~RTPSessionFacade() = default;
	//TODO: Make async
	virtual int Enqueue(const RTPPacket::shared& packet)	 { return SendPacket(*packet); }
	virtual int SendPLI(DWORD ssrc)				 { return RequestFPU();}
	
	int Init(const Properties &properties)
	{
		RTPMap rtp;
		RTPMap apt;
		
		//Get codecs
		std::vector<Properties> codecs;
		properties.GetChildrenArray("codecs",codecs);

		//For each codec
		for (auto it = codecs.begin(); it!=codecs.end(); ++it)
		{
			
			BYTE codec = (BYTE)-1;
			//Depending on the type
			switch (GetMediaType())
			{
				case MediaFrame::Audio:
					codec = (BYTE)AudioCodec::GetCodecForName(it->GetProperty("codec"));
					break;
				case MediaFrame::Video:
					codec = (BYTE)VideoCodec::GetCodecForName(it->GetProperty("codec"));
					break;
				default:
					//Skip
					continue;
			}
			//If not found
			if (codec == (BYTE)-1)
				//Skip
				continue;
			//Get codec type
			BYTE type = it->GetProperty("pt",0);
			//ADD it
			rtp[type] = codec;
		}
	
		//Set local 
		RTPSession::SetSendingRTPMap(rtp,apt);
		RTPSession::SetReceivingRTPMap(rtp,apt);
		
		//Call parent
		return RTPSession::Init();
	}
};



class PlayerFacade :
	public MP4Streamer,
	public MP4Streamer::Listener
{
public:
	PlayerFacade(v8::Handle<v8::Object> object) :
		MP4Streamer(this),
		persistent(object),
		audio(MediaFrame::Audio),
		video(MediaFrame::Video)
	{
		Reset();
		//Start dispatching
		audio.Start();
		video.Start();
	}
		
	virtual void onRTPPacket(RTPPacket &packet)
	{
		switch(packet.GetMedia())
		{
			case MediaFrame::Video:
				//Update stats
				video.media.Update(getTimeMS(),packet.GetSeqNum(),packet.GetRTPHeader().GetSize()+packet.GetMediaLength());
				//Set ssrc of video
				packet.SetSSRC(video.media.ssrc);
				//Multiplex
				video.AddPacket(packet.Clone());
				break;
			case MediaFrame::Audio:
				//Update stats
				audio.media.Update(getTimeMS(),packet.GetSeqNum(),packet.GetRTPHeader().GetSize()+packet.GetMediaLength());
				//Set ssrc of audio
				packet.SetSSRC(audio.media.ssrc);
				//Multiplex
				audio.AddPacket(packet.Clone());
				break;
			default:
				///Ignore
				return;
		}
	}

	virtual void onTextFrame(TextFrame &frame) {}
	virtual void onEnd() 
	{
		//Run function on main node thread
		MediaServer::Async([=](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv2[0];
			//Get a local reference
			v8::Local<v8::Object> local = Nan::New(persistent);
			//Create callback function from object
			v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(local->Get(Nan::New("onended").ToLocalChecked()));
			//Call object method with arguments
			Nan::MakeCallback(local, callback, i, argv2);
		});
	}
	
	void Reset() 
	{
		audio.media.Reset();
		video.media.Reset();
		audio.media.ssrc = rand();
		video.media.ssrc = rand();
	}
	
	virtual void onMediaFrame(MediaFrame &frame)  {}
	virtual void onMediaFrame(DWORD ssrc, MediaFrame &frame) {}

	RTPIncomingSourceGroup* GetAudioSource() { return &audio; }
	RTPIncomingSourceGroup* GetVideoSource() { return &video; }
	
private:
	Nan::Persistent<v8::Object> persistent;	
	//TODO: Update to multitrack
	RTPIncomingSourceGroup audio;
	RTPIncomingSourceGroup video;
};

class RTPSenderFacade
{
public:	
	RTPSenderFacade(DTLSICETransport* transport)
	{
		sender = transport;
	}

	RTPSenderFacade(RTPSessionFacade* session)
	{
		sender = session;
	}
	
	RTPSender* get() { return sender;}
private:
	RTPSender* sender;
};

class RTPReceiverFacade
{
public:	
	RTPReceiverFacade(DTLSICETransport* transport)
	{
		receiver = transport;
	}

	RTPReceiverFacade(RTPSessionFacade* session)
	{
		receiver = session;
	}
	
	RTPReceiverFacade(PCAPTransportEmulator *transport)
	{
		receiver = transport;
	}
	
	int SendPLI(DWORD ssrc)
	{
		return receiver ? receiver->SendPLI(ssrc) : 0;
	}
	
	RTPReceiver* get() { return receiver;}
private:
	RTPReceiver* receiver;
};


RTPSenderFacade* TransportToSender(DTLSICETransport* transport)
{
	return new RTPSenderFacade(transport);
}
RTPReceiverFacade* TransportToReceiver(DTLSICETransport* transport)
{
	return new RTPReceiverFacade(transport);
}

RTPReceiverFacade* PCAPTransportEmulatorToReceiver(PCAPTransportEmulator* transport)
{
	return new RTPReceiverFacade(transport);
}

RTPSenderFacade* SessionToSender(RTPSessionFacade* session)
{
	return new RTPSenderFacade(session);	
}
RTPReceiverFacade* SessionToReceiver(RTPSessionFacade* session)
{
	return new RTPReceiverFacade(session);
}

class RTPStreamTransponderFacade : 
	public RTPStreamTransponder
{
public:
	RTPStreamTransponderFacade(RTPOutgoingSourceGroup* outgoing,RTPSenderFacade* sender, v8::Handle<v8::Object> object) :
		RTPStreamTransponder(outgoing, sender ? sender->get() : NULL),
		persistent(object)
	{}

	bool SetIncoming(RTPIncomingSourceGroup* incoming, RTPReceiverFacade* receiver)
	{
		return RTPStreamTransponder::SetIncoming(incoming, receiver ? receiver->get() : NULL);
	}
	
	virtual void onREMB(RTPOutgoingSourceGroup* group,DWORD ssrc, DWORD bitrate) override
	{
		//Check we have not send an update too recently (1s)
		if (getTimeDiff(last)/1000<period)
			//Do nothing
			return;
		
		//Update it
		last = getTime();
		
		//Run function on main node thread
		MediaServer::Async([=](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv2[1];
			
			//Create local args
			argv2[i++] = Nan::New<v8::Uint32>(bitrate);
			
			//Get a local reference
			v8::Local<v8::Object> local = Nan::New(persistent);
			//Create callback function from object
			v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(local->Get(Nan::New("onremb").ToLocalChecked()));
			//Call object method with arguments
			Nan::MakeCallback(local, callback, i, argv2);
		});
	}
	
	void SetMinPeriod(DWORD period) { this->period = period; }
	
private:
	DWORD period	= 1000;
	QWORD last	= 0;
	Nan::Persistent<v8::Object> persistent;	
};

class StreamTrackDepacketizer :
	public RTPIncomingSourceGroup::Listener
{
public:
	StreamTrackDepacketizer(RTPIncomingSourceGroup* incomingSource)
	{
		//Store
		this->incomingSource = incomingSource;
		//Add us as RTP listeners
		this->incomingSource->AddListener(this);
		//No depkacketixer yet
		depacketizer = NULL;
	}

	virtual ~StreamTrackDepacketizer()
	{
		//JIC
		Stop();
		//Check 
		if (depacketizer)
			//Delete depacketier
			delete(depacketizer);
	}

	virtual void onRTP(RTPIncomingSourceGroup* group,const RTPPacket::shared& packet)
	{
		//Do not do extra work if there are no listeners
		if (listeners.empty()) 
			return;
		
		//If depacketizer is not the same codec 
		if (depacketizer && depacketizer->GetCodec()!=packet->GetCodec())
		{
			//Delete it
			delete(depacketizer);
			//Create it next
			depacketizer = NULL;
		}
		//If we don't have a depacketized
		if (!depacketizer)
			//Create one
			depacketizer = RTPDepacketizer::Create(packet->GetMedia(),packet->GetCodec());
		//Ensure we have it
		if (!depacketizer)
			//Do nothing
			return;
		//Pass the pakcet to the depacketizer
		 MediaFrame* frame = depacketizer->AddPacket(packet);
		 
		 //If we have a new frame
		 if (frame)
		 {
			 //Call all listeners
			 for (Listeners::const_iterator it = listeners.begin();it!=listeners.end();++it)
				 //Call listener
				 (*it)->onMediaFrame(packet->GetSSRC(),*frame);
			 //Next
			 depacketizer->ResetFrame();
		 }
		
			
	}
	
	virtual void onEnded(RTPIncomingSourceGroup* group) 
	{
		if (incomingSource==group)
			incomingSource = nullptr;
	}
	
	void AddMediaListener(MediaFrame::Listener *listener)
	{
		//Add to set
		listeners.insert(listener);
	}
	
	void RemoveMediaListener(MediaFrame::Listener *listener)
	{
		//Remove from set
		listeners.erase(listener);
	}
	
	void Stop()
	{
		//If already stopped
		if (!incomingSource)
			//Done
			return;
		
		//Stop listeneing
		incomingSource->RemoveListener(this);
		//Clean it
		incomingSource = NULL;
	}
	
private:
	typedef std::set<MediaFrame::Listener*> Listeners;
private:
	Listeners listeners;
	RTPDepacketizer* depacketizer;
	RTPIncomingSourceGroup* incomingSource;
};


class SenderSideEstimatorListener : 
	public RemoteRateEstimator::Listener
{
public:
	SenderSideEstimatorListener(v8::Handle<v8::Object> object)
		: persistent(object)
	{
		
	}
	
	virtual void onTargetBitrateRequested(DWORD bitrate) override 
	{
		//Check we have not send an update too recently (1s)
		if (getTimeDiff(last)/1000<period)
			//Do nothing
			return;
		
		//Update it
		last = getTime();
		
		//Run function on main node thread
		MediaServer::Async([=](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv2[1];
			
			//Create local args
			argv2[i++] = Nan::New<v8::Uint32>(bitrate);
			
			//Get a local reference
			v8::Local<v8::Object> local = Nan::New(persistent);
			//Create callback function from object
			v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(local->Get(Nan::New("ontargetbitrate").ToLocalChecked()));
			//Call object method with arguments
			Nan::MakeCallback(local, callback, i, argv2);
		
		});
	}
	
	void SetMinPeriod(DWORD period) { this->period = period; }
	
private:
	DWORD period	= 1000;
	QWORD last	= 0;
	Nan::Persistent<v8::Object> persistent;
};

//Empty implementation of event source
EvenSource::EvenSource()
{
}

EvenSource::EvenSource(const char* str)
{
}

EvenSource::EvenSource(const std::wstring &str)
{
}

EvenSource::~EvenSource()
{
}

void EvenSource::SendEvent(const char* type,const char* msg,...)
{
}

class LayerSources : public std::vector<LayerSource*>
{
public:
	size_t size() const		{ return std::vector<LayerSource*>::size(); }
	LayerSource* get(size_t i)	{ return  std::vector<LayerSource*>::at(i); }
};

class ActiveSpeakerDetectorFacade :
	public ActiveSpeakerDetector,
	public ActiveSpeakerDetector::Listener,
	public RTPIncomingSourceGroup::Listener
{
public:	
	ActiveSpeakerDetectorFacade(v8::Handle<v8::Object> object) :
		ActiveSpeakerDetector(this),
		persistent(object) 
	{};
		
	virtual void onActiveSpeakerChanded(uint32_t id) override
	{
		//Run function on main node thread
		MediaServer::Async([=](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv2[1];
			
			//Create local args
			argv2[i++] = Nan::New<v8::Uint32>(id);
			
			//Get a local reference
			v8::Local<v8::Object> local = Nan::New(persistent);
			//Create callback function from object
			v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(local->Get(Nan::New("onactivespeakerchanged").ToLocalChecked()));
			//Call object method with arguments
			Nan::MakeCallback(local, callback, i, argv2);
		});
	}
	
	void AddIncomingSourceGroup(RTPIncomingSourceGroup* incoming)
	{
		if (incoming) incoming->AddListener(this);
	}
	
	void RemoveIncomingSourceGroup(RTPIncomingSourceGroup* incoming)
	{
		if (incoming)
		{	
			ScopedLock lock(mutex);
			incoming->RemoveListener(this);
			ActiveSpeakerDetector::Release(incoming->media.ssrc);
		}
	}
	
	virtual void onRTP(RTPIncomingSourceGroup* group,const RTPPacket::shared& packet) override
	{
		if (packet->HasAudioLevel())
		{
			ScopedLock lock(mutex);
			ActiveSpeakerDetector::Accumulate(packet->GetSSRC(), packet->GetVAD(),packet->GetLevel(), getTimeMS());
		}
	}		
	
	
	virtual void onEnded(RTPIncomingSourceGroup* group) override
	{
		
	}
private:
	Mutex mutex;
	Nan::Persistent<v8::Object> persistent;	
};

%}

%include "stdint.i"
%include "std_vector.i"
%include "../media-server/include/config.h"	
%include "../media-server/include/media.h"
%include "../media-server/include/acumulator.h"

struct LayerInfo
{
	static BYTE MaxLayerId; 
	BYTE temporalLayerId = MaxLayerId;
	BYTE spatialLayerId  = MaxLayerId;
};

struct LayerSource : public LayerInfo
{
	DWORD		numPackets;
	DWORD		totalBytes;
	DWORD		bitrate;
};

class LayerSources : public std::vector<LayerSource*>
{
public:
	size_t size() const;
	LayerSource* get(size_t i);
};

struct RTPSource 
{
	DWORD ssrc;
	DWORD extSeqNum;
	DWORD cycles;
	DWORD jitter;
	DWORD numPackets;
	DWORD numRTCPPackets;
	DWORD totalBytes;
	DWORD totalRTCPBytes;
	DWORD bitrate;
};

struct RTPIncomingSource : public RTPSource
{
	DWORD lostPackets;
	DWORD totalPacketsSinceLastSR;
	DWORD totalBytesSinceLastSR;
	DWORD minExtSeqNumSinceLastSR ;
	DWORD lostPacketsSinceLastSR;
	QWORD lastReceivedSenderNTPTimestamp;
	QWORD lastReceivedSenderReport;
	QWORD lastReport;
	DWORD totalPLIs;
	DWORD totalNACKs;
	
	%extend 
	{
		LayerSources layers() 
		{
			LayerSources layers;
			for(auto it = $self->layers.begin(); it != $self->layers.end(); ++it )
				layers.push_back(&(it->second));
			return layers;
		}
	}
};
	
struct RTPOutgoingSource : public RTPSource
{
	
	DWORD time;
	DWORD lastTime;
	DWORD numPackets;
	DWORD numRTCPPackets;
	DWORD totalBytes;
	DWORD totalRTCPBytes;
	QWORD lastSenderReport;
	QWORD lastSenderReportNTP;
};

struct RTPOutgoingSourceGroup
{
	RTPOutgoingSourceGroup(MediaFrame::Type type);
	RTPOutgoingSourceGroup(std::string &streamId,MediaFrame::Type type);
	
	MediaFrame::Type  type;
	RTPOutgoingSource media;
	RTPOutgoingSource fec;
	RTPOutgoingSource rtx;
	
	void Update();
};

struct RTPIncomingSourceGroup
{
	RTPIncomingSourceGroup(MediaFrame::Type type);
	std::string rid;
	std::string mid;
	DWORD rtt;
	MediaFrame::Type  type;
	RTPIncomingSource media;
	RTPIncomingSource fec;
	RTPIncomingSource rtx;
	DWORD lost;
	DWORD minWaitedTime;
	DWORD maxWaitedTime;
	double avgWaitedTime;
	
	void Update();
};

%typemap(in) v8::Handle<v8::Object> {
	$1 = v8::Handle<v8::Object>::Cast($input);
}

class StringFacade : private std::string
{
public:
	StringFacade(const char* str);
	StringFacade(std::string &str);
	const char* toString();
};

class PropertiesFacade : private Properties
{
public:
	void SetProperty(const char* key,int intval);
	void SetProperty(const char* key,const char* val);
	void SetProperty(const char* key,bool boolval);
};

class MediaServer
{
public:
	static void RunCallback(v8::Handle<v8::Object> object);
	static void Initialize();
	static void Terminate();
	static void EnableLog(bool flag);
	static void EnableDebug(bool flag);
	static void EnableUltraDebug(bool flag);
	static StringFacade GetFingerprint();
	static bool SetPortRange(int minPort, int maxPort);
};

class RTPBundleTransport
{
public:
	RTPBundleTransport();
	int Init();
	int Init(int port);
	DTLSICETransport* AddICETransport(const std::string &username,const Properties& properties);
	int RemoveICETransport(const std::string &username);
	int End();
	int GetLocalPort() const { return port; }
	int AddRemoteCandidate(const std::string& username,const char* ip, WORD port);		
};

%include "../media-server/include/UDPReader.h"
class PCAPTransportEmulator
{
public:
	PCAPTransportEmulator();
	
	void SetRemoteProperties(const Properties& properties);

	bool AddIncomingSourceGroup(RTPIncomingSourceGroup *group);
	bool RemoveIncomingSourceGroup(RTPIncomingSourceGroup *group);
	
	bool Open(const char* filename);
	bool SetReader(UDPReader* reader);
	bool Play();
	uint64_t Seek(uint64_t time);
	bool Stop();
	bool Close();
};


%nodefaultctor DTLSICETransport; 
class DTLSICETransport
{
public:
	void Start();
	void Stop();
	
	void SetSRTPProtectionProfiles(const std::string& profiles);
	void SetRemoteProperties(const Properties& properties);
	void SetLocalProperties(const Properties& properties);
	virtual int SendPLI(DWORD ssrc) override;
	virtual int Enqueue(const RTPPacket::shared& packet) override;
	int Dump(const char* filename, bool inbound = true, bool outbound = true, bool rtcp = true);
	int Dump(UDPDumper* dumper, bool inbound = true, bool outbound = true, bool rtcp = true);
	void Reset();
	
	void ActivateRemoteCandidate(ICERemoteCandidate* candidate,bool useCandidate, DWORD priority);
	int SetRemoteCryptoDTLS(const char *setup,const char *hash,const char *fingerprint);
	int SetLocalSTUNCredentials(const char* username, const char* pwd);
	int SetRemoteSTUNCredentials(const char* username, const char* pwd);
	bool AddOutgoingSourceGroup(RTPOutgoingSourceGroup *group);
	bool RemoveOutgoingSourceGroup(RTPOutgoingSourceGroup *group);
	bool AddIncomingSourceGroup(RTPIncomingSourceGroup *group);
	bool RemoveIncomingSourceGroup(RTPIncomingSourceGroup *group);
	
	void SetBandwidthProbing(bool probe);
	void SetMaxProbingBitrate(DWORD bitrate);
	void SetSenderSideEstimatorListener(RemoteRateEstimator::Listener* listener);
	
	const char* GetRemoteUsername() const;
	const char* GetRemotePwd()	const;
	const char* GetLocalUsername()	const;
	const char* GetLocalPwd()	const;
	
	DWORD GetRTT() const { return rtt; }
};

class RTPSessionFacade :
	public RTPSender,
	public RTPReceiver
{
public:
	RTPSessionFacade(MediaFrame::Type media);
	int Init(const Properties &properties);
	int SetLocalPort(int recvPort);
	int GetLocalPort();
	int SetRemotePort(char *ip,int sendPort);
	RTPOutgoingSourceGroup* GetOutgoingSourceGroup();
	RTPIncomingSourceGroup* GetIncomingSourceGroup();
	int End();
	virtual int Enqueue(const RTPPacket::shared& packet);
	virtual int SendPLI(DWORD ssrc);
};


class RTPSenderFacade
{
public:	
	RTPSenderFacade(DTLSICETransport* transport);
	RTPSenderFacade(RTPSessionFacade* session);
	RTPSender* get();

};

class RTPReceiverFacade
{
public:	
	RTPReceiverFacade(DTLSICETransport* transport);
	RTPReceiverFacade(RTPSessionFacade* session);
	RTPReceiverFacade(PCAPTransportEmulator *transport);
	RTPReceiver* get();
	int SendPLI(DWORD ssrc);
};


RTPSenderFacade*	TransportToSender(DTLSICETransport* transport);
RTPReceiverFacade*	TransportToReceiver(DTLSICETransport* transport);
RTPReceiverFacade*	PCAPTransportEmulatorToReceiver(PCAPTransportEmulator* transport);
RTPSenderFacade*	SessionToSender(RTPSessionFacade* session);
RTPReceiverFacade*	SessionToReceiver(RTPSessionFacade* session);

class RTPStreamTransponderFacade 
{
public:
	RTPStreamTransponderFacade(RTPOutgoingSourceGroup* outgoing,RTPSenderFacade* sender,v8::Handle<v8::Object> object);
	bool SetIncoming(RTPIncomingSourceGroup* incoming, RTPReceiverFacade* receiver);
	void SelectLayer(int spatialLayerId,int temporalLayerId);
	void Mute(bool muting);
	void Close();
};

class StreamTrackDepacketizer 
{
public:
	StreamTrackDepacketizer(RTPIncomingSourceGroup* incomingSource);
	//SWIG doesn't support inner classes, so specializing it here, it will be casted internally later
	void AddMediaListener(MP4Recorder* listener);
	void RemoveMediaListener(MP4Recorder* listener);
	void Stop();
};


class PlayerFacade
{
public:
	PlayerFacade(v8::Handle<v8::Object> object);
	RTPIncomingSourceGroup* GetAudioSource();
	RTPIncomingSourceGroup* GetVideoSource();
	void Reset();
	
	int Open(const char* filename);
	bool HasAudioTrack();
	bool HasVideoTrack();
	DWORD GetAudioCodec();
	DWORD GetVideoCodec();
	double GetDuration();
	DWORD GetVideoWidth();
	DWORD GetVideoHeight();
	DWORD GetVideoBitrate();
	double GetVideoFramerate();
	int Play();
	QWORD PreSeek(QWORD time);
	int Seek(QWORD time);
	QWORD Tell();
	int Stop();
	int Close();
};

class SenderSideEstimatorListener :
	public RemoteRateEstimator::Listener
{
public:
	SenderSideEstimatorListener(v8::Handle<v8::Object> object);
};


class ActiveSpeakerDetectorFacade
{
public:	
	ActiveSpeakerDetectorFacade(v8::Handle<v8::Object> object);
	void SetMinChangePeriod(uint32_t minChangePeriod);
	void AddIncomingSourceGroup(RTPIncomingSourceGroup* incoming);
	void RemoveIncomingSourceGroup(RTPIncomingSourceGroup* incoming);
};
