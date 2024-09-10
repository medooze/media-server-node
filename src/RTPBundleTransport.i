%include "shared_ptr.i"

%{
using RTPBundleTransportConnection = RTPBundleTransport::Connection; 
%}

%nodefaultctor RTPBundleTransportConnection;
%nodefaultdtor RTPBundleTransportConnection;
struct RTPBundleTransportConnection
{
	DTLSICETransportShared transport;
	bool disableSTUNKeepAlive;
	size_t iceRequestsSent		= 0;
	size_t iceRequestsReceived	= 0;
	size_t iceResponsesSent		= 0;
	size_t iceResponsesReceived	= 0;
};

SHARED_PTR(RTPBundleTransportConnection)

class RTPBundleTransport
{
public:
	RTPBundleTransport(uint32_t packetPoolSize);
	int Init();
	int Init(int port);
	RTPBundleTransportConnectionShared AddICETransport(const std::string &username,const Properties& properties,const std::string& logId);
	bool RestartICETransport(const std::string& username, const std::string& restarted, const Properties& properties);
	int RemoveICETransport(const std::string &username);
	int End();
	int GetLocalPort() const { return port; }
	int AddRemoteCandidate(const std::string& username,const char* ip, WORD port);		
	void SetCandidateRawTxData(const std::string& ip, uint16_t port, uint32_t selfAddr, const std::string& dstLladdr);

	%exception SetRawTx {
		try {
			$action
		} catch (std::system_error& exc) {
			SWIG_exception(SWIG_SystemError, exc.what());
		}
	}
	void SetRawTx(int32_t ifindex, unsigned int sndbuf, bool skipQdisc, const std::string& selfLladdr, uint32_t defaultSelfAddr, const std::string& defaultDstLladdr, uint16_t port);
	void ClearRawTx();

	bool SetAffinity(int cpu);
	bool SetThreadName(const std::string& name);
	bool SetPriority(int priority);
	void SetIceTimeout(uint32_t timeout);
	TimeService& GetTimeService();
};