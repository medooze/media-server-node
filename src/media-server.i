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
#include "../media-server/include/rtp/RTPIncomingMediaStreamDepacketizer.h"
#include "../media-server/include/ActiveSpeakerDetector.h"
	
using RTPBundleTransportConnection = RTPBundleTransport::Connection;
using MediaFrameListener = MediaFrame::Listener;


template<typename T>
struct CopyablePersistentTraits {
public:
	typedef Nan::Persistent<T, CopyablePersistentTraits<T> > CopyablePersistent;
	static const bool kResetInDestructor = true;
	template<typename S, typename M>
	static inline void Copy(const Nan::Persistent<S, M> &source, CopyablePersistent *dest) {}
	template<typename S, typename M>
	static inline void Copy(const v8::Persistent<S, M>&, v8::Persistent<S, CopyablePersistentTraits<S> >*){}
};

template<typename T>
class NonCopyablePersistentTraits { 
public:
  typedef Nan::Persistent<T, NonCopyablePersistentTraits<T> > NonCopyablePersistent;
  static const bool kResetInDestructor = true;

  template<typename S, typename M>
  static void Copy(const Nan::Persistent<S, M> &source, NonCopyablePersistent *dest);

  template<typename O> static void Uncompilable();
};

template<typename T >
using Persistent = Nan::Persistent<T,NonCopyablePersistentTraits<T>>;


bool MakeCallback(const std::shared_ptr<Persistent<v8::Object>>& persistent, const char* name, int argc = 0, v8::Local<v8::Value>* argv = nullptr)
{
	Nan::HandleScope scope;
	//Ensure we have an object
	if (!persistent)
		return false;
	//Get a local reference
	v8::Local<v8::Object> local = Nan::New(*persistent);
	//Check it is not empty
	if (local.IsEmpty())
		return false;
	//Get event name
	auto method = Nan::New(name).ToLocalChecked();
	//Check it has it
	if (!local->Has(method))
		return false;
	//Create callback function from object
	v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(local->Get(method));
	//If it is callable
	if (!callback->IsCallable())
		return false;
	//Call object method with arguments
	Nan::MakeCallback(local, callback, argc, argv);
	
	//Done 
	return true;
}
		
			
class PropertiesFacade : private Properties
{
public:
	void SetPropertyInt(const char* key,int intval)
	{
		Properties::SetProperty(key,intval);
	}
	void SetPropertyStr(const char* key,const char* val)
	{
		Properties::SetProperty(key,val);
	}
	void SetPropertyBool(const char* key,bool boolval)
	{
		Properties::SetProperty(key,boolval);
	}
};



class MediaServer
{
public:
	typedef std::list<v8::Local<v8::Value>> Arguments;
public:
		
	~MediaServer()
	{
		Terminate();
	}
	
	/*
	 * Async
	 *  Enqueus a function to the async queue and signals main thread to execute it
	 */
	static void Async(std::function<void()> func) 
	{
		//Lock
		mutex.Lock();
		//Check if not terminatd
		if (uv_is_active((uv_handle_t *)&async))
		{
			//Enqueue
			queue.push_back(func);
			//Signal main thread
			uv_async_send(&async);
		}
		//Unlock
		mutex.Unlock();
	}

	static void Initialize()
	{
		Debug("-MediaServer::Initialize\n");
		//Initialize ssl
		OpenSSL::ClassInit();
		
		//Start DTLS
		DTLSConnection::Initialize();
		
		//Init async handler
		uv_async_init(uv_default_loop(), &async, async_cb_handler);
	}
	
	static void Terminate()
	{
		Debug("-MediaServer::Terminate\n");
		//Lock
		mutex.Lock();
		//empty queue
		queue.clear();
		//Close handle
		uv_close((uv_handle_t *)&async, NULL);
		//Unlock
		mutex.Unlock();
	}
	
	static void EnableLog(bool flag)
	{
		//Enable log
		Logger::EnableLog(flag);
	}
	
	static void EnableDebug(bool flag)
	{
		//Enable debug
		Logger::EnableDebug(flag);
	}
	
	static void EnableUltraDebug(bool flag)
	{
		//Enable debug
		Logger::EnableUltraDebug(flag);
	}
	
	static bool SetPortRange(int minPort, int maxPort)
	{
		return RTPTransport::SetPortRange(minPort,maxPort);
	}
	
	static bool SetCertificate(const char* cert,const char* key)
	{
		//Stop TLS
		DTLSConnection::Terminate();
		//Set new certificates
		DTLSConnection::SetCertificate(cert,key);
		//Start DTLS
		return DTLSConnection::Initialize();
	}
	
	static std::string GetFingerprint()
	{
		return DTLSConnection::GetCertificateFingerPrint(DTLSConnection::Hash::SHA256);
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
	virtual int Enqueue(const RTPPacket::shared& packet)  { return SendPacket(packet); }
	virtual int Enqueue(const RTPPacket::shared& packet,std::function<RTPPacket::shared(const RTPPacket::shared&)> modifier) { return SendPacket(modifier(packet)); }
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
		
		//Set properties
		RTPSession::SetProperties(properties.GetChildren("properties"));
		
		//Call parent
		return RTPSession::Init();
	}
};

class MP4RecorderFacade :
	public MP4Recorder,
	public MP4Recorder::Listener
{
public:
	MP4RecorderFacade(v8::Handle<v8::Object> object) :
		MP4Recorder(this)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}

	void onFirstFrame(QWORD time) override
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>((uint32_t)time);
			//Call object method with arguments
			MakeCallback(cloned, "onstarted", i, argv);
		});
	}
	void onClosed() override 
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[0];
			//Call object method with arguments
			MakeCallback(cloned, "onclosed", i, argv);
		});
	}
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};

class PlayerFacade :
	public MP4Streamer,
	public MP4Streamer::Listener
{
public:
	PlayerFacade(v8::Handle<v8::Object> object) :
		MP4Streamer(this),
		audio(MediaFrame::Audio,loop),
		video(MediaFrame::Video,loop)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
		Reset();
		//Start dispatching
		audio.Start();
		video.Start();
	}
		
	virtual void onRTPPacket(RTPPacket &packet)
	{
		//Clone packet
		auto cloned = packet.Clone();
		//Copy payload
		cloned->AdquireMediaData();
		//Check media type
		switch(cloned->GetMediaType())
		{
			case MediaFrame::Video:
				//Update stats
				video.media.Update(getTimeMS(),cloned->GetSeqNum(),cloned->GetRTPHeader().GetSize()+cloned->GetMediaLength());
				//Set ssrc of video
				cloned->SetSSRC(video.media.ssrc);
				//Multiplex
				video.AddPacket(cloned,0);
				break;
			case MediaFrame::Audio:
				//Update stats
				audio.media.Update(getTimeMS(),cloned->GetSeqNum(),cloned->GetRTPHeader().GetSize()+cloned->GetMediaLength());
				//Set ssrc of audio
				cloned->SetSSRC(audio.media.ssrc);
				//Multiplex
				audio.AddPacket(cloned,0);
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
		MediaServer::Async([=,cloned=persistent](){
			//Call object method with arguments
			MakeCallback(cloned, "onended");
		});
	}
	
	void Reset() 
	{
		audio.media.Reset();
		video.media.Reset();
		audio.media.ssrc = rand();
		video.media.ssrc = rand();
	}
	
	virtual void onMediaFrame(const MediaFrame &frame)  {}
	virtual void onMediaFrame(DWORD ssrc, const MediaFrame &frame) {}

	RTPIncomingMediaStream* GetAudioSource() { return &audio; }
	RTPIncomingMediaStream* GetVideoSource() { return &video; }
	
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;	
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
		RTPStreamTransponder(outgoing, sender ? sender->get() : NULL)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}

	virtual ~RTPStreamTransponderFacade() = default;

	bool SetIncoming(RTPIncomingMediaStream* incoming, RTPReceiverFacade* receiver)
	{
		return RTPStreamTransponder::SetIncoming(incoming, receiver ? receiver->get() : NULL);
	}
	
	bool SetIncoming(RTPIncomingMediaStream* incoming, RTPReceiver* receiver)
	{
		return RTPStreamTransponder::SetIncoming(incoming, receiver);
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
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>(bitrate);
			//Call object method with arguments
			MakeCallback(cloned, "onremb", i, argv);
		});
	}
	
	void SetMinPeriod(DWORD period) { this->period = period; }
	
private:
	DWORD period	= 1000;
	QWORD last	= 0;
	std::shared_ptr<Persistent<v8::Object>> persistent;	
};

class DTLSICETransportListener :
	public DTLSICETransport::Listener
{
public:
	DTLSICETransportListener(v8::Handle<v8::Object> object)
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

private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
};

class SenderSideEstimatorListener : 
	public RemoteRateEstimator::Listener
{
public:
	SenderSideEstimatorListener(v8::Handle<v8::Object> object)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}
	
	virtual void onTargetBitrateRequested(DWORD bitrate) override 
	{
		//Run function on main node thread
		MediaServer::Async([=,cloned=persistent](){
			Nan::HandleScope scope;
			int i = 0;
			v8::Local<v8::Value> argv[1];
			//Create local args
			argv[i++] = Nan::New<v8::Uint32>(bitrate);
			//Call object method with arguments
			MakeCallback(cloned, "ontargetbitrate", i, argv);
		
		});
	}
private:
	std::shared_ptr<Persistent<v8::Object>> persistent;
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
	public RTPIncomingMediaStream::Listener
{
public:	
	ActiveSpeakerDetectorFacade(v8::Handle<v8::Object> object) :
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
	
	virtual void onRTP(RTPIncomingMediaStream* incoming,const RTPPacket::shared& packet) override
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
	
	virtual void onBye(RTPIncomingMediaStream* group) 
	{
	}
	
	virtual void onEnded(RTPIncomingMediaStream* incoming) override
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
	std::map<RTPIncomingMediaStream*,uint32_t> sources;
	std::shared_ptr<Persistent<v8::Object>> persistent;
};

%}

%include "stdint.i"
%include "std_string.i"
%include "std_vector.i"
#define QWORD		uint64_t
#define DWORD		uint32_t
#define WORD		uint16_t
#define SWORD		int16_t
#define BYTE		uint8_t
#define SBYTE		char
%{
using MediaFrameType = MediaFrame::Type;
%}
enum MediaFrameType;

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

class LayerSources
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
	DWORD numPacketsDelta;
	DWORD numRTCPPackets;
	DWORD totalBytes;
	DWORD totalRTCPBytes;
	DWORD bitrate;
	DWORD clockrate;
};

struct RTPIncomingSource : public RTPSource
{
	DWORD numFrames;
	DWORD numFramesDelta;
	DWORD lostPackets;
	DWORD lostPacketsDelta;
	DWORD dropPackets;
	DWORD totalPacketsSinceLastSR;
	DWORD totalBytesSinceLastSR;
	DWORD minExtSeqNumSinceLastSR ;
	DWORD lostPacketsSinceLastSR;
	QWORD lastReceivedSenderNTPTimestamp;
	QWORD lastReceivedSenderReport;
	QWORD lastReport;
	DWORD totalPLIs;
	DWORD totalNACKs;
	int64_t skew;
	double  drift;
	
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

%nodefaultctor TimeService;
struct TimeService
{
	
};

struct RTPOutgoingSourceGroup
{
	RTPOutgoingSourceGroup(MediaFrameType type);
	RTPOutgoingSourceGroup(std::string &streamId,MediaFrameType type);
	
	MediaFrameType  type;
	RTPOutgoingSource media;
	RTPOutgoingSource fec;
	RTPOutgoingSource rtx;
	
	void Update();
};

%nodefaultctor RTPSender;
%nodefaultdtor RTPSender; 
struct RTPSender {};

%nodefaultctor RTPReceiver;
%nodefaultdtor RTPReceiver; 
struct RTPReceiver {};

%{
using RTPIncomingMediaStreamListener = RTPIncomingMediaStream::Listener;
%}
%nodefaultctor RTPIncomingMediaStreamListener;
struct RTPIncomingMediaStreamListener
{
};

%nodefaultctor RTPIncomingMediaStream;
%nodefaultdtor RTPIncomingMediaStream; 
struct RTPIncomingMediaStream 
{
};

struct RTPIncomingSourceGroup : public RTPIncomingMediaStream
{
	RTPIncomingSourceGroup(MediaFrameType type, TimeService& TimeService);
	std::string rid;
	std::string mid;
	DWORD rtt;
	MediaFrameType  type;
	RTPIncomingSource media;
	RTPIncomingSource fec;
	RTPIncomingSource rtx;
	DWORD lost;
	DWORD minWaitedTime;
	DWORD maxWaitedTime;
	double avgWaitedTime;
	
	void AddListener(RTPIncomingMediaStreamListener* listener);
	void RemoveListener(RTPIncomingMediaStreamListener* listener);
	
	void Update();
};

struct RTPIncomingMediaStreamMultiplexer : public RTPIncomingMediaStream, public RTPIncomingMediaStreamListener
{
	RTPIncomingMediaStreamMultiplexer(DWORD ssrc, TimeService& TimeService);
	void Stop();
};

%typemap(in) v8::Handle<v8::Object> {
	$1 = v8::Handle<v8::Object>::Cast($input);
}

class PropertiesFacade : private Properties
{
public:
	void SetPropertyInt(const char* key,int intval);
	void SetPropertyStr(const char* key,const char* val);
	void SetPropertyBool(const char* key,bool boolval);
};

class MediaServer
{
public:
	static void Initialize();
	static void Terminate();
	static void EnableLog(bool flag);
	static void EnableDebug(bool flag);
	static void EnableUltraDebug(bool flag);
	static bool SetCertificate(const char* cert,const char* key);
	static std::string GetFingerprint();
	static bool SetPortRange(int minPort, int maxPort);
};


%nodefaultctor RTPBundleTransportConnection;
%nodefaultdtor RTPBundleTransportConnection;
struct RTPBundleTransportConnection
{
	DTLSICETransport* transport;
	bool disableSTUNKeepAlive;
	size_t iceRequestsSent		= 0;
	size_t iceRequestsReceived	= 0;
	size_t iceResponsesSent		= 0;
	size_t iceResponsesReceived	= 0;
};
	
	
class RTPBundleTransport
{
public:
	RTPBundleTransport();
	int Init();
	int Init(int port);
	RTPBundleTransportConnection* AddICETransport(const std::string &username,const Properties& properties);
	int RemoveICETransport(const std::string &username);
	int End();
	int GetLocalPort() const { return port; }
	int AddRemoteCandidate(const std::string& username,const char* ip, WORD port);		
	bool SetAffinity(int cpu);
	void SetIceTimeout(uint32_t timeout);
	TimeService& GetTimeService();
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
	
	TimeService& GetTimeService();
};

class DTLSICETransportListener
{
public:
	DTLSICETransportListener(v8::Handle<v8::Object> object);
};

%{
using RemoteRateEstimatorListener = RemoteRateEstimator::Listener;
%}
%nodefaultctor RemoteRateEstimatorListener;
struct RemoteRateEstimatorListener
{
};

%nodefaultctor DTLSICETransport; 
class DTLSICETransport
{
public:
	void SetListener(DTLSICETransportListener* listener);

	void Start();
	void Stop();
	
	void SetSRTPProtectionProfiles(const std::string& profiles);
	void SetRemoteProperties(const Properties& properties);
	void SetLocalProperties(const Properties& properties);
	virtual int SendPLI(DWORD ssrc) override;
	virtual int Enqueue(const RTPPacket::shared& packet) override;
	int Dump(const char* filename, bool inbound = true, bool outbound = true, bool rtcp = true,bool rtpHeadersOnly = false);
	int Dump(UDPDumper* dumper, bool inbound = true, bool outbound = true, bool rtcp, bool rtpHeadersOnly = false);
	int StopDump();
	int DumpBWEStats(const char* filename);
	int StopDumpBWEStats();
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
	void SetProbingBitrateLimit(DWORD bitrate);
	void SetSenderSideEstimatorListener(RemoteRateEstimatorListener* listener);
	
	const char* GetRemoteUsername() const;
	const char* GetRemotePwd()	const;
	const char* GetLocalUsername()	const;
	const char* GetLocalPwd()	const;
	
	DWORD GetRTT() const { return rtt; }
	
	TimeService& GetTimeService();
};

class RTPSessionFacade :
	public RTPSender,
	public RTPReceiver
{
public:
	RTPSessionFacade(MediaFrameType media);
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
	bool SetIncoming(RTPIncomingMediaStream* incoming, RTPReceiverFacade* receiver);
	bool SetIncoming(RTPIncomingMediaStream* incoming, RTPReceiver* receiver);
	bool AppendH264ParameterSets(const std::string& sprops);
	void SelectLayer(int spatialLayerId,int temporalLayerId);
	void Mute(bool muting);
	void Close();
};

%nodefaultctor MediaFrameListener;
%nodefaultdtor MediaFrameListener;
struct MediaFrameListener
{
};

class RTPIncomingMediaStreamDepacketizer 
{
public:
	RTPIncomingMediaStreamDepacketizer(RTPIncomingMediaStream* incomingSource);
	void AddMediaListener(MediaFrameListener* listener);
	void RemoveMediaListener(MediaFrameListener* listener);
	void Stop();
};

class MP4RecorderFacade :
	public MediaFrameListener
{
public:
	MP4RecorderFacade(v8::Handle<v8::Object> object);

	//Recorder interface
	virtual bool Create(const char *filename);
		bool Record(bool waitVideo, bool disableHints);
	virtual bool Stop();
	virtual bool Close();
	void SetTimeShiftDuration(DWORD duration);
	bool SetH264ParameterSets(const std::string& sprops);
	bool Close(bool async);
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
	public RemoteRateEstimatorListener
{
public:
	SenderSideEstimatorListener(v8::Handle<v8::Object> object);
};


class ActiveSpeakerDetectorFacade
{
public:	
	ActiveSpeakerDetectorFacade(v8::Handle<v8::Object> object);
	void SetMinChangePeriod(uint32_t minChangePeriod);
	void SetMaxAccumulatedScore(uint64_t maxAcummulatedScore);
	void SetNoiseGatingThreshold(uint8_t noiseGatingThreshold);
	void SetMinActivationScore(uint32_t minActivationScore);
	void AddIncomingSourceGroup(RTPIncomingMediaStream* incoming, uint32_t id);
	void RemoveIncomingSourceGroup(RTPIncomingMediaStream* incoming);
};
