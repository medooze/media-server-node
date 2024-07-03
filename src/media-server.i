%module medooze
%{
#include <perfetto.h>
#include "MedoozeTracing.h"
#include <stdlib.h>
	
#include <string>
#include <list>
#include <functional>
#include <nan.h>
#include "config.h"	
#include "concurrentqueue.h"
#include "dtls.h"
#include "OpenSSL.h"
#include "media.h"
#include "rtp.h"
#include "rtpsession.h"
#include "DTLSICETransport.h"	
#include "RTPBundleTransport.h"
#include "PCAPTransportEmulator.h"	
#include "mp4recorder.h"
#include "mp4streamer.h"
#include "vp9/VP9LayerSelector.h"
#include "rtp/RTPIncomingMediaStreamDepacketizer.h"
#include "ActiveSpeakerDetector.h"
#include "ActiveSpeakerMultiplexer.h"
#include "SimulcastMediaFrameListener.h"
#include "../external/srtp/gcm_aes_backend.h"

template<typename T>
struct CopyablePersistentTraits {
public:
	typedef Nan::Persistent<T, CopyablePersistentTraits<T> > CopyablePersistent;
	static const bool kResetInDestructor = true;
	template<typename S, typename M>
	static inline void Copy(const Nan::Persistent<S, M> &source, CopyablePersistent *dest) {}
	template<typename S, typename M>
	static inline void Copy(const v8::Persistent<S, M>&, v8::Persistent<S, CopyablePersistentTraits<S> >*){}
};

template<typename T>
class NonCopyablePersistentTraits { 
public:
  typedef Nan::Persistent<T, NonCopyablePersistentTraits<T> > NonCopyablePersistent;
  static const bool kResetInDestructor = true;

  template<typename S, typename M>
  static void Copy(const Nan::Persistent<S, M> &source, NonCopyablePersistent *dest);

  template<typename O> static void Uncompilable();
};

template<typename T >
using Persistent = Nan::Persistent<T,NonCopyablePersistentTraits<T>>;


%}

%include "stdint.i"
%include "std_string.i"
%include "std_vector.i"
%include "exception.i"

#define QWORD		uint64_t
#define DWORD		uint32_t
#define WORD		uint16_t
#define SWORD		int16_t
#define BYTE		uint8_t
#define SBYTE		char

%typemap(in) v8::Local<v8::Object> {
	$1 = v8::Local<v8::Object>::Cast($input);
}

%include "ActiveSpeakerDetectorFacade.i"
%include "ActiveSpeakerMultiplexerFacade.i"
%include "DTLSICETransport.i"
%include "EventLoop.i"
%include "MediaServer.i"
%include "MediaFrame.i"
%include "MediaFrameReader.i"
%include "MP4RecorderFacade.i"
%include "PCAPTransportEmulator.i"
%include "PlayerFacade.i"
%include "Properties.i"
%include "RemoteRateEstimatorListener.i"
%include "RTPSource.i"
%include "RTPIncomingSource.i"
%include "RTPOutgoingSource.i"
%include "RTPOutgoingSourceGroup.i"
%include "RTPSender.i"
%include "RTPSessionFacade.i"
%include "RTPReceiver.i"
%include "RTPIncomingMediaStream.i"
%include "RTPIncomingSourceGroup.i"
%include "RTPIncomingMediaStreamMultiplexer.i"
%include "RTPBundleTransport.i"
%include "RTPIncomingMediaStreamDepacketizer.i"
%include "RTPStreamTransponderFacade.i"
%include "SenderSideEstimatorListener.i"
%include "SimulcastMediaFrameListener.i"
%include "MediaFrameListenerBridge.i"
%include "FrameDispatchCoordinator.i"

%init %{
	auto tracingVar = getenv("MEDOOZE_TRACING");
	if (tracingVar && std::string(tracingVar) == "1") {
		perfetto::TracingInitArgs args;
		//args.backends |= perfetto::kInProcessBackend;
		args.backends |= perfetto::kSystemBackend;
		perfetto::Tracing::Initialize(args);
		MedoozeTrackEventRegister();
	}

	AesGcmSrtpBackend_Register();

	MediaServer::Initialize();
	std::atexit(MediaServer::Terminate);
%}
