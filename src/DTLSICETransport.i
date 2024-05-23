%include "shared_ptr.i"
%include "RTPSender.i"
%include "RTPReceiver.i"
%include "RTPIncomingSourceGroup.i"
%include "RTPOutgoingSourceGroup.i"
%include "DTLSICETransportListener.i"

%typemap(out) std::vector<datachannels::DataChannel::shared> {

	v8::EscapableHandleScope handScope(v8::Isolate::GetCurrent());

	v8::Local<v8::Array> array = v8::Array::New(v8::Isolate::GetCurrent(), $1.size());

	for (size_t i = 0; i < $1.size(); i++)
	{
		auto shared = new datachannels::DataChannel::shared($1.at(i));
		[[maybe_unused]] auto r = array->Set(SWIGV8_CURRENT_CONTEXT(), i, SWIG_NewPointerObj(SWIG_as_voidptr(shared), SWIGTYPE_p_DataChannelShared,SWIG_POINTER_OWN));
	}
	
	$result = handScope.Escape(array);
}

%typemap(out) std::unordered_map<std::string, std::vector<datachannels::DataChannel::shared>> {
	
	v8::EscapableHandleScope handScope(v8::Isolate::GetCurrent());
	v8::Local<v8::Map> map = v8::Map::New(v8::Isolate::GetCurrent());
	
	for (auto it = $1.begin(); it != $1.end(); it++)
	{
		v8::Local<v8::String> id = SWIGV8_STRING_NEW2(it->first.c_str(), it->first.length());
		v8::Local<v8::Array> array = v8::Array::New(v8::Isolate::GetCurrent(), it->second.size());

		for (size_t i = 0; i < it->second.size(); i++)
		{
			auto shared = new datachannels::DataChannel::shared(it->second.at(i));
			[[maybe_unused]] auto r = array->Set(SWIGV8_CURRENT_CONTEXT(), i, SWIG_NewPointerObj(SWIG_as_voidptr(shared), SWIGTYPE_p_DataChannelShared,SWIG_POINTER_OWN));
		}
		
		[[maybe_unused]] auto r = map->Set(SWIGV8_CURRENT_CONTEXT(), id, array);
	}

	$result = handScope.Escape(map);
}

%typemap(out) std::optional<std::string> {
	if ($1.has_value())
	{
		$result = SWIG_From_std_string(static_cast< std::string >($1.value()));
	}
	else
	{
		$result = SWIGV8_UNDEFINED();
	}
}

%nodefaultctor DTLSICETransport; 
%nodefaultdtor DTLSICETransport; 
struct DTLSICETransport
{
	void SetListener(const DTLSICETransportListenerShared& listener);

	void Start();
	void Stop();
	
	void SetSRTPProtectionProfiles(const std::string& profiles);
	void SetRemoteProperties(const Properties& properties);
	void SetLocalProperties(const Properties& properties);
	virtual int SendPLI(DWORD ssrc) override;
	int Dump(const char* filename, bool inbound = true, bool outbound = true, bool rtcp = true,bool rtpHeadersOnly = false);
	int Dump(UDPDumper* dumper, bool inbound = true, bool outbound = true, bool rtcp = true, bool rtpHeadersOnly = false);
	int StopDump();
	int DumpBWEStats(const char* filename);
	int StopDumpBWEStats();
	void Reset();
	
	void ActivateRemoteCandidate(ICERemoteCandidate* candidate,bool useCandidate, DWORD priority);
	int SetRemoteCryptoDTLS(const char *setup,const char *hash,const char *fingerprint);
	int SetLocalSTUNCredentials(const char* username, const char* pwd);
	int SetRemoteSTUNCredentials(const char* username, const char* pwd);
	bool AddOutgoingSourceGroup(const RTPOutgoingSourceGroupShared& group);
	bool RemoveOutgoingSourceGroup(const RTPOutgoingSourceGroupShared& group);
	bool AddIncomingSourceGroup(const RTPIncomingSourceGroupShared& group);
	bool RemoveIncomingSourceGroup(const RTPIncomingSourceGroupShared& group);
	
	void SetDataChannelEndpointMode(datachannels::Endpoint::Mode mode);
	void CreateDataChannel(const std::string& label, const std::string& endpointIdentifier);
	
	void SetBandwidthProbing(bool probe);
	void SetMaxProbingBitrate(DWORD bitrate);
	void SetProbingBitrateLimit(DWORD bitrate);
	void EnableSenderSideEstimation(bool enabled);
	void SetSenderSideEstimatorListener(RemoteRateEstimatorListener* listener);
	uint32_t GetAvailableOutgoingBitrate() const;
	uint32_t GetEstimatedOutgoingBitrate() const;
	uint32_t GetTotalSentBitrate() const;

	void SetRemoteOverrideBWE(bool overrideBWE);
	void SetRemoteOverrideBitrate(DWORD bitrate);
	
	const char* GetRemoteUsername() const;
	const char* GetRemotePwd()	const;
	const char* GetLocalUsername()	const;
	const char* GetLocalPwd()	const;
	
	DWORD GetRTT() const { return rtt; }
	
	TimeService& GetTimeService();
	
	std::unordered_map<std::string, std::vector<datachannels::DataChannel::shared>> GetDataChannels() const;
	
	std::optional<std::string> GetEndpointIdentifier(datachannels::DataChannel& dataChannel) const;
};

SHARED_PTR_BEGIN(DTLSICETransport)
{
	SHARED_PTR_TO(RTPSender)
	SHARED_PTR_TO(RTPReceiver)
}
SHARED_PTR_END(DTLSICETransport)
