{
	'variables':
	{
		'external_libmediaserver%'		: '<!(echo $LIBMEDIASERVER)',
		'external_libmediaserver_include_dirs%'	: '<!(echo $LIBMEDIASERVER_INCLUDE)',
        'medooze_media_server_src' : "<!(node -e \"require('medooze-media-server-src')\")",
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
				"-flto",
				#"-O0",
				#"-fsanitize=address,leak",
				#"-fsanitize-address-use-after-scope",
                                #"-fno-omit-frame-pointer"
			],
			"cflags_cc": 
			[
				"-fexceptions",
				"-std=c++17",
				"-O3",
				"-g",
				"-Wno-unused-function",
				"-flto",
				#"-O0",
				#"-fsanitize=address,leak",
				#"-fsanitize-address-use-after-scope",
                                #"-fno-omit-frame-pointer"
			],
			"include_dirs" : 
			[
				'/usr/include/nodejs/',
				"external/perfetto",
				"<!(node -e \"require('nan')\")"
			],
			"ldflags" : [" -lpthread -lresolv -flto"],
			"link_settings": 
			{
        			'libraries': ["-lpthread -lresolv"]
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
							'<(medooze_media_server_src)/include',
							'<(medooze_media_server_src)/src',
							'<(medooze_media_server_src)/ext/crc32c/include',
							'<(medooze_media_server_src)/ext/libdatachannels/src',
							'<(medooze_media_server_src)/ext/libdatachannels/src/internal',
							'external/mp4v2/lib/include',
							'external/mp4v2/config/include',
							'external/srtp/include',
							'<(node_root_dir)/deps/openssl/openssl/include'
						],
						"sources": 
						[
							"<(medooze_media_server_src)/ext/crc32c/src/crc32c.cc",
							"<(medooze_media_server_src)/ext/crc32c/src/crc32c_portable.cc",
							"<(medooze_media_server_src)/ext/crc32c/src/crc32c_sse42.cc",
							"<(medooze_media_server_src)/ext/crc32c/src/crc32c_arm64.cc",
							"<(medooze_media_server_src)/ext/libdatachannels/src/Datachannels.cpp",
							"<(medooze_media_server_src)/src/MedoozeTracing.cpp",
							"<(medooze_media_server_src)/src/ActiveSpeakerDetector.cpp",
							"<(medooze_media_server_src)/src/ActiveSpeakerMultiplexer.cpp",
							"<(medooze_media_server_src)/src/EventLoop.cpp",
							"<(medooze_media_server_src)/src/log.cpp",
							"<(medooze_media_server_src)/src/PacketHeader.cpp",
							"<(medooze_media_server_src)/src/MacAddress.cpp",
							"<(medooze_media_server_src)/src/RTPBundleTransport.cpp",
							"<(medooze_media_server_src)/src/DTLSICETransport.cpp",
							"<(medooze_media_server_src)/src/VideoLayerSelector.cpp",
							"<(medooze_media_server_src)/src/opus/opusdepacketizer.cpp",
							"<(medooze_media_server_src)/src/h264/h264depacketizer.cpp",
							"<(medooze_media_server_src)/src/h265/h265.cpp",
							"<(medooze_media_server_src)/src/h265/H265Depacketizer.cpp",
							"<(medooze_media_server_src)/src/h265/HEVCDescriptor.cpp",
							"<(medooze_media_server_src)/src/vp8/vp8depacketizer.cpp",
							"<(medooze_media_server_src)/src/h264/H264LayerSelector.cpp",
							"<(medooze_media_server_src)/src/vp8/VP8LayerSelector.cpp",
							"<(medooze_media_server_src)/src/vp9/VP9PayloadDescription.cpp",
							"<(medooze_media_server_src)/src/vp9/VP9LayerSelector.cpp",
							"<(medooze_media_server_src)/src/vp9/VP9Depacketizer.cpp",
							"<(medooze_media_server_src)/src/av1/AV1Depacketizer.cpp",
							"<(medooze_media_server_src)/src/av1/AV1LayerSelector.cpp",
							"<(medooze_media_server_src)/src/av1/Obu.cpp",
							"<(medooze_media_server_src)/src/SRTPSession.cpp",
							"<(medooze_media_server_src)/src/dtls.cpp",
							"<(medooze_media_server_src)/src/CPUMonitor.cpp",
							"<(medooze_media_server_src)/src/OpenSSL.cpp",
							"<(medooze_media_server_src)/src/RTPTransport.cpp",
							"<(medooze_media_server_src)/src/httpparser.cpp",
							"<(medooze_media_server_src)/src/stunmessage.cpp",
							"<(medooze_media_server_src)/src/crc32calc.cpp",
							"<(medooze_media_server_src)/src/http.cpp",
							"<(medooze_media_server_src)/src/avcdescriptor.cpp",
							"<(medooze_media_server_src)/src/utf8.cpp",
							"<(medooze_media_server_src)/src/DependencyDescriptorLayerSelector.cpp",
							"<(medooze_media_server_src)/src/rtp/DependencyDescriptor.cpp",
							"<(medooze_media_server_src)/src/rtp/LayerInfo.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPCommonHeader.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPHeader.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPHeaderExtension.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPApp.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPExtendedJitterReport.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPPacket.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPReport.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPSenderReport.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPMap.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPBye.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPFullIntraRequest.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPPayloadFeedback.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPRTPFeedback.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPDepacketizer.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPPacket.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPPayload.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPCompoundPacket.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPNACK.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPReceiverReport.cpp",
							"<(medooze_media_server_src)/src/rtp/RTCPSDES.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPPacketSched.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPStreamTransponder.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPLostPackets.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPSource.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPIncomingMediaStreamMultiplexer.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPIncomingMediaStreamDepacketizer.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPIncomingSource.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPIncomingSourceGroup.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPOutgoingSource.cpp",
							"<(medooze_media_server_src)/src/rtp/RTPOutgoingSourceGroup.cpp",
							"<(medooze_media_server_src)/src/mp4recorder.cpp",
							"<(medooze_media_server_src)/src/mp4streamer.cpp",
							"<(medooze_media_server_src)/src/rtpsession.cpp",
							"<(medooze_media_server_src)/src/RTPTransport.cpp",
							"<(medooze_media_server_src)/src/PCAPFile.cpp",
							"<(medooze_media_server_src)/src/PCAPReader.cpp",
							"<(medooze_media_server_src)/src/PCAPTransportEmulator.cpp",
							"<(medooze_media_server_src)/src/remoteratecontrol.cpp",
							"<(medooze_media_server_src)/src/remoterateestimator.cpp",
							"<(medooze_media_server_src)/src/SendSideBandwidthEstimation.cpp",
							"<(medooze_media_server_src)/src/SimulcastMediaFrameListener.cpp",
							"<(medooze_media_server_src)/src/ForwardErrorCorrection.cpp",
							"<(medooze_media_server_src)/src/FecProbeGenerator.cpp"
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
									"include_dirs": [  "<(medooze_media_server_src)/ext/crc32c/config/Darwin-i386" ],
								}],
								['OS=="linux"',{
									"variables": {
										"sse42_support": "<!(cat /proc/cpuinfo | grep -c sse4_2 || true)"
									},
									"conditions" : [
										["target_arch=='x64'",{
											"conditions"  : [["sse42_support==0",{
												"include_dirs": [  "<(medooze_media_server_src)/ext/crc32c/config/Linux-x86_64_nosse42" ]
											},{
												"include_dirs": [  "<(medooze_media_server_src)/ext/crc32c/config/Linux-x86_64" ]
											}]],
											"include_dirs": [  "<(medooze_media_server_src)/ext/crc32c/config/Linux-arm64" ]
										}],
										["target_arch=='arm64'",{
											"include_dirs": [  "<(medooze_media_server_src)/ext/crc32c/config/Linux-aarch64" ]
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

