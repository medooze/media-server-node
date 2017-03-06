%module medooze
%{
	
#include <string>
#include "../media-server/include/config.h"	
#include "../media-server/include/dtls.h"	
#include "../media-server/include/media.h"
#include "../media-server/include/rtp.h"
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
	static StringFacade GetFingerprint()
	{
		return StringFacade(DTLSConnection::GetCertificateFingerPrint(DTLSConnection::Hash::SHA256).c_str());
	}
	
};

class StreamTransceiver : 
	public RTPIncomingSourceGroup::Listener,
	public RTPOutgoingSourceGroup::Listener
{
public:
	StreamTransceiver(RTPIncomingSourceGroup* incomingSource, DTLSICETransport* incomingTransport, RTPOutgoingSourceGroup* outgoingSource,DTLSICETransport* outgoingTransport)
	{
		//Store streams
		this->incomingSource = incomingSource;
		this->outgoingSource = outgoingSource;
		this->incomingTransport = incomingTransport;
		this->outgoingTransport = outgoingTransport;
		
		//Add us as listeners
		outgoingSource->AddListener(this);
		incomingSource->AddListener(this);
		
		//Request update on the incoming
		incomingTransport->SendPLI(incomingSource->media.ssrc);
	}

	virtual ~StreamTransceiver()
	{
		//Stop listeneing
		outgoingSource->RemoveListener(this);
		incomingSource->RemoveListener(this);	
	}

	virtual void onRTP(RTPIncomingSourceGroup* group,RTPPacket* packet)
	{
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
		
		//Change ssrc
		packet->SetSSRC(outgoingSource->media.ssrc);
		//Send it on transport
		outgoingTransport->Send(*packet);
	}
	
	virtual void onPLIRequest(RTPOutgoingSourceGroup* group,DWORD ssrc)
	{
		//Request update on the incoming
		incomingTransport->SendPLI(incomingSource->media.ssrc);
	}
	
	void SelectLayer(int spatialLayerId,int temporalLayerId)
	{
		if (selector.GetSpatialLayer()<spatialLayerId)
			//Request update on the incoming
			incomingTransport->SendPLI(incomingSource->media.ssrc);
		selector.SelectSpatialLayer(spatialLayerId);
		selector.SelectTemporalLayer(temporalLayerId);
	}
private:
	RTPOutgoingSourceGroup *outgoingSource;
	RTPIncomingSourceGroup *incomingSource;
	DTLSICETransport* incomingTransport;
	DTLSICETransport* outgoingTransport;
	VP9LayerSelector selector;
};

%}
%include "stdint.i"
%include "../media-server/include/config.h"	

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
	static StringFacade GetFingerprint();
};


class StreamTransceiver : 
	public RTPIncomingSourceGroup::Listener,
	public RTPOutgoingSourceGroup::Listener
{
public:
	StreamTransceiver(RTPIncomingSourceGroup* incomingSource, DTLSICETransport* incomingTransport, RTPOutgoingSourceGroup* outgoingSource,DTLSICETransport* outgoingTransport);
	virtual ~StreamTransceiver();
	virtual void onRTP(RTPIncomingSourceGroup* group,RTPPacket* packet);
	virtual void onPLIRequest(RTPOutgoingSourceGroup* group,DWORD ssrc);
	void SelectLayer(int spatialLayerId,int temporalLayerId);
};


%include "../media-server/include/media.h"
%include "../media-server/include/rtp.h"
%include "../media-server/include/DTLSICETransport.h"
%include "../media-server/include/RTPBundleTransport.h"
%include "../media-server/include/mp4recorder.h"
