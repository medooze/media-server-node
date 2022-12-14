
%nodefaultctor TimeService;
%nodefaultdtor TimeService;
struct TimeService
{
};

class EventLoop : public TimeService
{
public:
	bool Start();
	bool Stop();
};
