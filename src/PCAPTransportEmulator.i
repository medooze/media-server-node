
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