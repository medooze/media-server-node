%include "MediaServer.i"

%{
class PlayerFacade :
	public MP4Streamer,
	public MP4Streamer::Listener
{
public:
	PlayerFacade(v8::Local<v8::Object> object) :
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
		//Get time
		auto now = getTimeMS();
		//Clone packet
		auto cloned = packet.Clone();
		//Copy payload
		cloned->AdquireMediaData();
		//Check media type
		switch(cloned->GetMediaType())
		{
			case MediaFrame::Video:
				//Update stats
				video.media.Update(now,cloned->GetSeqNum(),cloned->GetRTPHeader().GetSize()+cloned->GetMediaLength());
				//Set ssrc of video
				cloned->SetSSRC(video.media.ssrc);
				//Multiplex
				video.AddPacket(cloned,0,now);
				break;
			case MediaFrame::Audio:
				//Update stats
				audio.media.Update(now,cloned->GetSeqNum(),cloned->GetRTPHeader().GetSize()+cloned->GetMediaLength());
				//Set ssrc of audio
				cloned->SetSSRC(audio.media.ssrc);
				//Multiplex
				audio.AddPacket(cloned,0,now);
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
%}

class PlayerFacade
{
public:
	PlayerFacade(v8::Local<v8::Object> object);
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
