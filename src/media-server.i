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
#include "../media-server/include/mp4recorder.h"
#include "../media-server/include/mp4streamer.h"
#include "../media-server/src/vp9/VP9LayerSelector.h"
#include "../media-server/include/rtp/RTPStreamTransponder.h"


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
		//Lock method
		ScopedLock scoped(mutex);
		//Get all
		while(!queue.empty())
		{
			//Execute first
			queue.front()();
			//Remove from queue
			queue.pop_front();
		}
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
	virtual int Send(const RTPPacket::shared& packet)	 { return SendPacket(*packet); }
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
			
			BYTE codec;
			//Depending on the type
			switch (GetMediaType())
			{
				case MediaFrame::Audio:
					codec = (BYTE)AudioCodec::GetCodecForName(it->GetProperty("codec"));
					break;
				case MediaFrame::Video:
					codec = (BYTE)VideoCodec::GetCodecForName(it->GetProperty("codec"));
					break;
				case MediaFrame::Text:
					codec = (BYTE)-1;
					break;
			}

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
	PlayerFacade() :
		MP4Streamer(this),
		audio(MediaFrame::Audio),
		video(MediaFrame::Video)
	{
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
	virtual void onEnd() {}
	
	virtual void onMediaFrame(MediaFrame &frame)  {}
	virtual void onMediaFrame(DWORD ssrc, MediaFrame &frame) {}

	RTPIncomingSourceGroup* GetAudioSource() { return &audio; }
	RTPIncomingSourceGroup* GetVideoSource() { return &video; }
	
private:
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
		reeciver = transport;
	}

	RTPReceiverFacade(RTPSessionFacade* session)
	{
		reeciver = session;
	}
	
	RTPReceiver* get() { return reeciver;}
private:
	RTPReceiver* reeciver;
};


RTPSenderFacade* TransportToSender(DTLSICETransport* transport)
{
	return new RTPSenderFacade(transport);
}
RTPReceiverFacade* TransportToReceiver(DTLSICETransport* transport)
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
	RTPStreamTransponderFacade(RTPOutgoingSourceGroup* outgoing,RTPSenderFacade* sender)
		: RTPStreamTransponder(outgoing, sender ? sender->get() : NULL)
	{

	}

	bool SetIncoming(RTPIncomingSourceGroup* incoming, RTPReceiverFacade* receiver)
	{
		return RTPStreamTransponder::SetIncoming(incoming, receiver ? receiver->get() : NULL);
	}
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
private:		
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

%}

%include "stdint.i"
%include "../media-server/include/config.h"	
%include "../media-server/include/media.h"
%include "../media-server/include/acumulator.h"


struct RTPSource 
{
	DWORD ssrc;
	DWORD extSeq;
	DWORD cycles;
	DWORD jitter;
	DWORD numPackets;
	DWORD numRTCPPackets;
	DWORD totalBytes;
	DWORD totalRTCPBytes;
	Acumulator bitrate;
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
	DWORD   totalPLIs;
	DWORD	totalNACKs;
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
	DWORD GetCurrentLost();
	DWORD GetMinWaitedTime();
	DWORD GetMaxWaitedTime();
	double GetAvgWaitedTime();
};


%include "../media-server/include/DTLSICETransport.h"
%include "../media-server/include/RTPBundleTransport.h"
%include "../media-server/include/mp4recorder.h"
%include "../media-server/include/rtp/RTPStreamTransponder.h"

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
	virtual int Send(const RTPPacket::shared& packet);
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
	RTPReceiver* get();
};


RTPSenderFacade*	TransportToSender(DTLSICETransport* transport);
RTPReceiverFacade*	TransportToReceiver(DTLSICETransport* transport);
RTPSenderFacade*	SessionToSender(RTPSessionFacade* session);
RTPReceiverFacade*	SessionToReceiver(RTPSessionFacade* session);

class RTPStreamTransponderFacade 
{
public:
	RTPStreamTransponderFacade(RTPOutgoingSourceGroup* outgoing,RTPSenderFacade* sender);
	virtual ~RTPStreamTransponderFacade();
	virtual void onRTP(RTPIncomingSourceGroup* group,const RTPPacket::shared& packet);
	virtual void onPLIRequest(RTPOutgoingSourceGroup* group,DWORD ssrc);
	bool SetIncoming(RTPIncomingSourceGroup* incoming, RTPReceiverFacade* receiver);
	void SelectLayer(int spatialLayerId,int temporalLayerId);
	void Mute(bool muting);
	void Close();
};

class StreamTrackDepacketizer 
{
public:
	StreamTrackDepacketizer(RTPIncomingSourceGroup* incomingSource);
	virtual ~StreamTrackDepacketizer();
	//SWIG doesn't support inner classes, so specializing it here, it will be casted internally later
	void AddMediaListener(MP4Recorder* listener);
	void RemoveMediaListener(MP4Recorder* listener);
	
	void Stop();
};


class PlayerFacade
{
public:
	PlayerFacade();
	RTPIncomingSourceGroup* GetAudioSource();
	RTPIncomingSourceGroup* GetVideoSource();
	
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
