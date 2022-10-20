{
	'variables':
	{
		'external_libmediaserver%'		: '<!(echo $LIBMEDIASERVER)',
		'external_libmediaserver_include_dirs%'	: '<!(echo $LIBMEDIASERVER_INCLUDE)',
	},
	"targets": 
	[
		{
			"target_name": "medooze-media-server",
			"cflags": 
			[
				"-march=native",
				"-fexceptions",
				"-O3",
				"-g",
				"-Wno-unused-function -Wno-comment",
				#"-O0",
				#"-fsanitize=address,leak"
			],
			"cflags_cc": 
			[
				"-fexceptions",
				"-std=c++17",
				"-O3",
				"-g",
				"-Wno-unused-function",
				#"-O0",
				#"-fsanitize=address,leak"
			],
			"include_dirs" : 
			[
				'/usr/include/nodejs/',
				"external/perfetto",
				"<!(node -e \"require('nan')\")"
			],
			"ldflags" : [" -lpthread -lresolv"],
			"link_settings": 
			{
        			'libraries': ["-lpthread -lpthread -lresolv"]
      			},
			"defines":
			[
				#"MEDOOZE_TRACING",
			],
			"sources": 
			[ 
				"external/perfetto/perfetto.cc",
				"src/media-server_wrap.cxx",
			],
			"conditions":
			[
				[
					"external_libmediaserver == ''", 
					{
						"include_dirs" :
						[
							'media-server/include',
							'media-server/src',
							'media-server/ext/crc32c/include',
							'media-server/ext/libdatachannels/src',
							'media-server/ext/libdatachannels/src/internal',
							'external/mp4v2/lib/include',
							'external/mp4v2/config/include',
							'external/srtp/include',
							'<(node_root_dir)/deps/openssl/openssl/include'
						],
						"sources": 
						[
							"media-server/ext/crc32c/src/crc32c.cc",
							"media-server/ext/crc32c/src/crc32c_portable.cc",
							"media-server/ext/crc32c/src/crc32c_sse42.cc",
							"media-server/ext/crc32c/src/crc32c_arm64.cc",
							"media-server/ext/libdatachannels/src/Datachannels.cpp",
							"media-server/src/MedoozeTracing.cpp",
							"media-server/src/ActiveSpeakerDetector.cpp",
							"media-server/src/ActiveSpeakerMultiplexer.cpp",
							"media-server/src/EventLoop.cpp",
							"media-server/src/PacketHeader.cpp",
							"media-server/src/MacAddress.cpp",
							"media-server/src/RTPBundleTransport.cpp",
							"media-server/src/DTLSICETransport.cpp",
							"media-server/src/VideoLayerSelector.cpp",
							"media-server/src/opus/opusdepacketizer.cpp",
							"media-server/src/h264/h264depacketizer.cpp",
							"media-server/src/h265/H265Depacketizer.cpp",
							"media-server/src/vp8/vp8depacketizer.cpp",
							"media-server/src/h264/H264LayerSelector.cpp",
							"media-server/src/vp8/VP8LayerSelector.cpp",
							"media-server/src/vp9/VP9PayloadDescription.cpp",
							"media-server/src/vp9/VP9LayerSelector.cpp",
							"media-server/src/vp9/VP9Depacketizer.cpp",
							"media-server/src/av1/AV1Depacketizer.cpp",
							"media-server/src/SRTPSession.cpp",
							"media-server/src/dtls.cpp",
							"media-server/src/CPUMonitor.cpp",
							"media-server/src/OpenSSL.cpp",
							"media-server/src/RTPTransport.cpp",
							"media-server/src/httpparser.cpp",
							"media-server/src/stunmessage.cpp",
							"media-server/src/crc32calc.cpp",
							"media-server/src/http.cpp",
							"media-server/src/avcdescriptor.cpp",
							"media-server/src/utf8.cpp",
							"media-server/src/DependencyDescriptorLayerSelector.cpp",
							"media-server/src/rtp/DependencyDescriptor.cpp",
							"media-server/src/rtp/LayerInfo.cpp",
							"media-server/src/rtp/RTCPCommonHeader.cpp",
							"media-server/src/rtp/RTPHeader.cpp",
							"media-server/src/rtp/RTPHeaderExtension.cpp",
							"media-server/src/rtp/RTCPApp.cpp",
							"media-server/src/rtp/RTCPExtendedJitterReport.cpp",
							"media-server/src/rtp/RTCPPacket.cpp",
							"media-server/src/rtp/RTCPReport.cpp",
							"media-server/src/rtp/RTCPSenderReport.cpp",
							"media-server/src/rtp/RTPMap.cpp",
							"media-server/src/rtp/RTCPBye.cpp",
							"media-server/src/rtp/RTCPFullIntraRequest.cpp",
							"media-server/src/rtp/RTCPPayloadFeedback.cpp",
							"media-server/src/rtp/RTCPRTPFeedback.cpp",
							"media-server/src/rtp/RTPDepacketizer.cpp",
							"media-server/src/rtp/RTPPacket.cpp",
							"media-server/src/rtp/RTPPayload.cpp",
							"media-server/src/rtp/RTCPCompoundPacket.cpp",
							"media-server/src/rtp/RTCPNACK.cpp",
							"media-server/src/rtp/RTCPReceiverReport.cpp",
							"media-server/src/rtp/RTCPSDES.cpp",
							"media-server/src/rtp/RTPPacketSched.cpp",
							"media-server/src/rtp/RTPStreamTransponder.cpp",
							"media-server/src/rtp/RTPLostPackets.cpp",
							"media-server/src/rtp/RTPSource.cpp",
							"media-server/src/rtp/RTPIncomingMediaStreamMultiplexer.cpp",
							"media-server/src/rtp/RTPIncomingMediaStreamDepacketizer.cpp",
							"media-server/src/rtp/RTPIncomingSource.cpp",
							"media-server/src/rtp/RTPIncomingSourceGroup.cpp",
							"media-server/src/rtp/RTPOutgoingSource.cpp",
							"media-server/src/rtp/RTPOutgoingSourceGroup.cpp",
							"media-server/src/mp4recorder.cpp",
							"media-server/src/mp4streamer.cpp",
							"media-server/src/rtpsession.cpp",
							"media-server/src/RTPTransport.cpp",
							"media-server/src/PCAPFile.cpp",
							"media-server/src/PCAPReader.cpp",
							"media-server/src/PCAPTransportEmulator.cpp",
							"media-server/src/remoteratecontrol.cpp",
							"media-server/src/remoterateestimator.cpp",
							"media-server/src/SendSideBandwidthEstimation.cpp",
							"media-server/src/SimulcastMediaFrameListener.cpp"
						],
						"dependencies":
						[
							"external/mp4v2/libmp4v2.gyp:mp4v2",
							"external/srtp/libsrtp.gyp:libsrtp",
						],
  					        "conditions" : [
								["target_arch=='ia32'", {
									"include_dirs": [ "<(node_root_dir)/deps/openssl/config/piii" ]
								}],
								["target_arch=='x64'", {
									"include_dirs": [ "<(node_root_dir)/deps/openssl/config/k8" ]
								}],
								["target_arch=='arm'", {
									"include_dirs": [ "<(node_root_dir)/deps/openssl/config/arm" ]
								}],
								['OS=="mac"', {
									"xcode_settings": {
										"CLANG_CXX_LIBRARY": "libc++",
										"CLANG_CXX_LANGUAGE_STANDARD": "c++17",
										"OTHER_CFLAGS": [ "-Wno-aligned-allocation-availability","-Wno-aligned-allocation-unavailable","-march=native"]
									},
									"include_dirs": [  "media-server/ext/crc32c/config/Darwin-i386" ],
								}],
								['OS=="linux"',{
									"variables": {
										"sse42_support": "<!(cat /proc/cpuinfo | grep -c sse4_2 || true)"
									},
									"conditions" : [
										["target_arch=='x64'",{
											"conditions"  : [["sse42_support==0",{
												"include_dirs": [  "media-server/ext/crc32c/config/Linux-x86_64_nosse42" ]
											},{
												"include_dirs": [  "media-server/ext/crc32c/config/Linux-x86_64" ]
											}]],
											"include_dirs": [  "media-server/ext/crc32c/config/Linux-arm64" ]
										}],
										["target_arch=='arm64'",{
											"include_dirs": [  "media-server/ext/crc32c/config/Linux-aarch64" ]
										}]
									],
									"cflags_cc":  [
										"-faligned-new",
										"-DHAVE_STD_ALIGNED_ALLOCC",
									]
								}]
						]
					},
					{
						"libraries"	: [ "<(external_libmediaserver)" ],
						"include_dirs"	: [ "<@(external_libmediaserver_include_dirs)" ],
						'conditions':
						[
							['OS=="linux"', {
								"ldflags" : [" -Wl,-Bsymbolic "],
							}],
							['OS=="mac"', {
									"xcode_settings": {
										"CLANG_CXX_LIBRARY": "libc++",
										"CLANG_CXX_LANGUAGE_STANDARD": "c++17",
										"OTHER_CFLAGS": [ "-Wno-aligned-allocation-unavailable","-march=native"]
									},
							}],
						]
					}
				]
			]
		}
	]
}

