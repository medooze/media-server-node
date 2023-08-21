%{

#include "../media-server/include/ThreadRegistry.h"

bool MakeCallback(const std::shared_ptr<Persistent<v8::Object>>& persistent, const char* name, int argc = 0, v8::Local<v8::Value>* argv = nullptr)
{
	Nan::HandleScope scope;
	//Ensure we have an object
	if (!persistent)
		return false;
	//Get a local reference
	v8::Local<v8::Object> local = Nan::New(*persistent);
	//Check it is not empty
	if (local.IsEmpty())
		return false;
	//Get event name
	auto method = Nan::New(name).ToLocalChecked();
	//Get attribute 
	auto attr = Nan::Get(local,method);
	//Check 
	if (attr.IsEmpty())
		return false;
	//Create callback function
	auto callback = Nan::To<v8::Function>(attr.ToLocalChecked());
	//Check 
	if (callback.IsEmpty())
		return false;
	//Call object method with arguments
	Nan::MakeCallback(local, callback.ToLocalChecked(), argc, argv);
	
	//Done 
	return true;
}
		
class MediaServer
{
public:
	typedef std::list<v8::Local<v8::Value>> Arguments;
public:
		
	~MediaServer()
	{
		Terminate();
	}
	
	/*
	 * Async
	 *  Enqueus a function to the async queue and signals main thread to execute it
	 */
	static void Async(std::function<void()> func) 
	{
		//Check if not terminatd
		if (uv_is_active((uv_handle_t *)&async))
		{
			//Enqueue
			queue.enqueue(std::move(func));
			//Signal main thread
			uv_async_send(&async);
		}
	}

	static void Initialize()
	{
		Debug("-MediaServer::Initialize\n");
		//Initialize ssl
		OpenSSL::ClassInit();
		
		//Start DTLS
		DTLSConnection::Initialize();
		
		//Init async handler
		uv_async_init(uv_default_loop(), &async, async_cb_handler);
	}
	
	static void Terminate()
	{
		Debug("-MediaServer::Terminate\n");
		//Close handle
		uv_close((uv_handle_t *)&async, NULL);
		
		std::function<void()> func;
		//Dequeue all pending functions
		while(queue.try_dequeue(func)){}
	}
	
	static void EnableLog(bool flag)
	{
		//Enable log
		Logger::EnableLog(flag);
	}
	
	static void EnableDebug(bool flag)
	{
		//Enable debug
		Logger::EnableDebug(flag);
	}
	
	static void EnableUltraDebug(bool flag)
	{
		//Enable debug
		Logger::EnableUltraDebug(flag);
	}
	
	static bool SetPortRange(int minPort, int maxPort)
	{
		return RTPTransport::SetPortRange(minPort,maxPort);
	}
	
	static bool SetCertificate(const char* cert,const char* key)
	{
		//Stop TLS
		DTLSConnection::Terminate();
		//Set new certificates
		DTLSConnection::SetCertificate(cert,key);
		//Start DTLS
		return DTLSConnection::Initialize();
	}
	
	static std::string GetFingerprint()
	{
		return DTLSConnection::GetCertificateFingerPrint(DTLSConnection::Hash::SHA256);
	}

	static void async_cb_handler(uv_async_t *handle)
	{
		std::function<void()> func;
		//Get all pending functions
		while(queue.try_dequeue(func))
		{
			//Execute async function
			func();
		}
	}

	static bool SetAffinity(int cpu)
	{
		return EventLoop::SetAffinity(pthread_self(), cpu);
	}

	static bool SetThreadName(const std::string& name)
	{
		return EventLoop::SetThreadName(pthread_self(), name);
	}
private:
	//http://stackoverflow.com/questions/31207454/v8-multithreaded-function
	static uv_async_t  async;
	static moodycamel::ConcurrentQueue<std::function<void()>> queue;
};

//Static initializaion
uv_async_t MediaServer::async;
moodycamel::ConcurrentQueue<std::function<void()>>  MediaServer::queue;

//Empty implementation of event source
EvenSource::EvenSource()
{
}

EvenSource::EvenSource(const char* str)
{
}

EvenSource::EvenSource(const std::wstring &str)
{
}

EvenSource::~EvenSource()
{
}

void EvenSource::SendEvent(const char* type,const char* msg,...)
{
}

%}

class MediaServer
{
public:
	static void Initialize();
	static void Terminate();
	static void EnableLog(bool flag);
	static void EnableDebug(bool flag);
	static void EnableUltraDebug(bool flag);
	static bool SetCertificate(const char* cert,const char* key);
	static std::string GetFingerprint();
	static bool SetPortRange(int minPort, int maxPort);
	static bool SetAffinity(int cpu);
	static bool SetThreadName(const std::string& name);
};

%init %{ 
	std::atexit(ThreadRegistry::Close);
%}