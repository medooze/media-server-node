%include "MediaServer.i"
%include "RTPIncomingMediaStream.i"
%include "RTPOutgoingSourceGroup.i"
%include "RTPReceiver.i"
%include "RTPSender.i"

%{

#include "../media-server/include/rtp/RTPStreamTransponder.h"

class RTPStreamTransponderFacade : 
	public RTPStreamTransponder
{
public:
	RTPStreamTransponderFacade(const RTPOutgoingSourceGroupShared& outgoing, const RTPSender::shared& sender, v8::Local<v8::Object> object) :
		RTPStreamTransponder(outgoing, sender)
	{
		persistent = std::make_shared<Persistent<v8::Object>>(object);
	}

	virtual ~RTPStreamTransponderFacade() = default;

	virtual void onREMB(const RTPOutgoingSourceGroup* group,DWORD ssrc, DWORD bitrate) override
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

%}

class RTPStreamTransponderFacade : 
	public RTPStreamTransponder
{
public:
	RTPStreamTransponderFacade(const RTPOutgoingSourceGroupShared& outgoing, const RTPSenderShared& sender,v8::Local<v8::Object> object);
	bool SetIncoming(const RTPIncomingMediaStreamShared& incoming, const RTPReceiverShared& receiver, bool smooth);
	bool ResetIncoming();
	bool AppendH264ParameterSets(const std::string& sprops);
	void SelectLayer(int spatialLayerId,int temporalLayerId);
	void Mute(bool muting);
	void SetIntraOnlyForwarding(bool intraOnlyForwarding);
	void Close();
};
