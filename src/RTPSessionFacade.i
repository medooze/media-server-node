%include "RTPSender.i"
%include "RTPReceiver.i"

%{
class RTPSessionFacade : 	
	public RTPSession,
	public RTPSender,
	public RTPReceiver
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
	virtual int SendPLI(DWORD ssrc)				 { return RequestFPU();}
	virtual int Reset(DWORD ssrc)				 { return 1;}
	
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
%}


class RTPSessionFacade
{
public:
	RTPSessionFacade(MediaFrameType media);
	int Init(const Properties &properties);
	int SetLocalPort(int recvPort);
	int GetLocalPort();
	int SetRemotePort(char *ip,int sendPort);
	RTPOutgoingSourceGroupShared GetOutgoingSourceGroup();
	RTPIncomingSourceGroupShared GetIncomingSourceGroup();
	int End();
	virtual int Enqueue(const RTPPacket::shared& packet);
	virtual int SendPLI(DWORD ssrc);
	virtual int Reset(DWORD ssrc);
	TimeService& GetTimeService();
};


SHARED_PTR_BEGIN(RTPSessionFacade)
{
	RTPSessionFacadeShared(MediaFrameType type)
	{
		return new std::shared_ptr<RTPSessionFacade>(new RTPSessionFacade(type));
	}

	SHARED_PTR_TO(RTPReceiver)
	SHARED_PTR_TO(RTPSender)
}
SHARED_PTR_END(RTPSessionFacade)
