%module medooze
%{
	
#include <string>
#include "../media-server/include/config.h"	
#include "../media-server/include/dtls.h"	
#include "../media-server/include/media.h"
#include "../media-server/include/rtp.h"
#include "../media-server/include/rtpsession.h"
#include "../media-server/include/DTLSICETransport.h"	
#include "../media-server/include/RTPBundleTransport.h"
#include "../media-server/include/mp4recorder.h"
#include "../media-server/src/vp9/VP9LayerSelector.h"
	

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
	static void Initialize()
	{
		//Start DTLS
		DTLSConnection::Initialize();
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
	
	static StringFacade GetFingerprint()
	{
		return StringFacade(DTLSConnection::GetCertificateFingerPrint(DTLSConnection::Hash::SHA256).c_str());
	}
	
};

class RTPSessionFacade : 	
	public RTPSender,
	public RTPReceiver,
	public RTPSession
{
public:
	RTPSessionFacade(MediaFrame::Type media) : RTPSession(media,NULL)
	{
		
	}
	virtual ~RTPSessionFacade()
	{
		
	}
	
	virtual int Send(RTPPacket &packet)
	{
		
	}
	virtual int SendPLI(DWORD ssrc)
	{
		return RequestFPU();
	}
	
	int Init(const Properties &properties)
	{
		RTPMap rtp;
		
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
		RTPSession::SetSendingRTPMap(rtp);
		RTPSession::SetReceivingRTPMap(rtp);
		
		//Call parent
		return RTPSession::Init();
	}
	
	virtual void onRTPPacket(BYTE* buffer, DWORD size)
	{
		RTPSession::onRTPPacket(buffer,size);
		RTPIncomingSourceGroup* incoming = GetIncomingSourceGroup();
		RTPPacket* ordered;
		//FOr each ordered packet
		while(ordered=GetOrderPacket())
			//Call listeners
			incoming->onRTP(ordered);
	}
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

class StreamTransponder : 
	public RTPIncomingSourceGroup::Listener,
	public RTPOutgoingSourceGroup::Listener
{
public:
	StreamTransponder(RTPIncomingSourceGroup* incoming, RTPReceiverFacade* receiver, RTPOutgoingSourceGroup* outgoing,RTPSenderFacade* sender)
	{
		//Store streams
		this->incoming = incoming;
		this->outgoing = outgoing;
		this->receiver = receiver->get();
		this->sender = sender->get();
		
		//Add us as listeners
		incoming->AddListener(this);
		outgoing->AddListener(this);
		
		//Request update on the incoming
		if (this->receiver) this->receiver->SendPLI(this->incoming->media.ssrc);
	}

	void Close()
	{
		ScopedLock lock(mutex);
		
		//Stop listeneing
		if (outgoing) outgoing->RemoveListener(this);
		if (incoming) incoming->RemoveListener(this);
		
		//Remove sources
		outgoing = NULL;
		incoming = NULL;
		receiver = NULL;
		sender = NULL;
	}
	
	virtual ~StreamTransponder()
	{
		//Stop listeneing
		Close();
	}

	virtual void onRTP(RTPIncomingSourceGroup* group,RTPPacket* packet)  override
	{
		ScopedLock lock(mutex);
		
		//Double check
		if (!group || !packet)
			//Error
			return;
		
		//Check if it is an VP9 packet
		if (packet->GetCodec()==VideoCodec::VP9)
		{
			DWORD extSeqNum;
			bool mark;
			//Select layer
			if (!selector.Select(packet,extSeqNum,mark))
			       //Drop
			       return;
		       //Set them
		       packet->SetSeqNum(extSeqNum);
		       packet->SetSeqCycles(extSeqNum >> 16);
		       //Set mark
		       packet->SetMark(mark);
		}
		
		//Double check
		if (outgoing && sender)
		{
			//Change ssrc
			packet->SetSSRC(outgoing->media.ssrc);
			//Send it on transport
			sender->Send(*packet);
		}
	}
	
	virtual void onPLIRequest(RTPOutgoingSourceGroup* group,DWORD ssrc) override
	{
		ScopedLock lock(mutex);
		//Request update on the incoming
		if (receiver && incoming) receiver->SendPLI(incoming->media.ssrc);
	}
	
	void SelectLayer(int spatialLayerId,int temporalLayerId)
	{
		ScopedLock lock(mutex);
		
		if (selector.GetSpatialLayer()<spatialLayerId)
			//Request update on the incoming
			if (receiver && incoming) receiver->SendPLI(incoming->media.ssrc);
		selector.SelectSpatialLayer(spatialLayerId);
		selector.SelectTemporalLayer(temporalLayerId);
	}
private:
	RTPOutgoingSourceGroup *outgoing;
	RTPIncomingSourceGroup *incoming;
	RTPReceiver* receiver;
	RTPSender* sender;
	VP9LayerSelector selector;
	Mutex mutex;
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
		//Stop listeneing
		incomingSource->RemoveListener(this);
		//Delete depacketier
		delete(depacketizer);
	}

	virtual void onRTP(RTPIncomingSourceGroup* group,RTPPacket* packet)
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
	
private:
	typedef std::set<MediaFrame::Listener*> Listeners;
private:
	Listeners listeners;
	RTPDepacketizer* depacketizer;
	RTPIncomingSourceGroup* incomingSource;
};





%}
%include "stdint.i"
%include "../media-server/include/config.h"	
%include "../media-server/include/media.h"
%include "../media-server/include/rtp.h"
%include "../media-server/include/DTLSICETransport.h"
%include "../media-server/include/RTPBundleTransport.h"
%include "../media-server/include/mp4recorder.h"


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
};

class MediaServer
{
public:
	static void Initialize();
	static void EnableDebug(bool flag);
	static void EnableUltraDebug(bool flag);
	static StringFacade GetFingerprint();
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
	virtual int Send(RTPPacket &packet);
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

class StreamTransponder : 
	public RTPIncomingSourceGroup::Listener,
	public RTPOutgoingSourceGroup::Listener
{
public:
	StreamTransponder(RTPIncomingSourceGroup* incoming, RTPReceiverFacade* receiver, RTPOutgoingSourceGroup* outgoing,RTPSenderFacade* sender);
	virtual ~StreamTransponder();
	virtual void onRTP(RTPIncomingSourceGroup* group,RTPPacket* packet);
	virtual void onPLIRequest(RTPOutgoingSourceGroup* group,DWORD ssrc);
	void SelectLayer(int spatialLayerId,int temporalLayerId);
	void Close();
};

class StreamTrackDepacketizer :
	public RTPIncomingSourceGroup::Listener
{
public:
	StreamTrackDepacketizer(RTPIncomingSourceGroup* incomingSource);
	virtual ~StreamTrackDepacketizer();
	//SWIG doesn't support inner classes, so specializing it here, it will be casted internally later
	void AddMediaListener(MP4Recorder* listener);
	void RemoveMediaListener(MP4Recorder* listener);
};

