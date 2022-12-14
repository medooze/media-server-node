%include "shared_ptr.i"
%include "RTPSender.i"
%include "RTPReceiver.i"
%include "DTLSICETransportListener.i"

%nodefaultctor DTLSICETransport; 
%nodefaultdtor DTLSICETransport; 
struct DTLSICETransport
{
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
	void EnableSenderSideEstimation(bool enabled);
	void SetSenderSideEstimatorListener(RemoteRateEstimatorListener* listener);
	uint32_t GetAvailableOutgoingBitrate() const;
	uint32_t GetEstimatedOutgoingBitrate() const;

	void SetRemoteOverrideBWE(bool overrideBWE);
	void SetRemoteOverrideBitrate(DWORD bitrate);
	
	const char* GetRemoteUsername() const;
	const char* GetRemotePwd()	const;
	const char* GetLocalUsername()	const;
	const char* GetLocalPwd()	const;
	
	DWORD GetRTT() const { return rtt; }
	
	TimeService& GetTimeService();
};

SHARED_PTR_BEGIN(DTLSICETransport)
{
	SHARED_PTR_TO(RTPSender)
	SHARED_PTR_TO(RTPReceiver)
}
SHARED_PTR_END(DTLSICETransport)
