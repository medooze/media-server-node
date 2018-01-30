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
				"-fexceptions",
				"-std=c++11",
				"-O3",
				#"-g",
				#"-O0",
				#"-fsanitize=address"
			],
			"include_dirs" : 
			[
				'/usr/include/nodejs/',
				"<!(node -e \"require('nan')\")"
			],
			"ldflags" : ["-lpthread -lresolv"],
			"link_settings": 
			{
        			'libraries': ["-lpthread -lpthread -lresolv"]
      			},
			"sources": 
			[ 
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
							'external/mp4v2/lib/include',
							'external/mp4v2/config/include',
							'external/srtp/include',
							'<(node_root_dir)/deps/openssl/openssl/include'
						],
						"sources": 
						[
							"media-server/src/RTPBundleTransport.cpp",
							"media-server/src/DTLSICETransport.cpp",
							"media-server/src/VideoLayerSelector.cpp",
							"media-server/src/h264/h264depacketizer.cpp",
							"media-server/src/vp8/vp8depacketizer.cpp",
							"media-server/src/vp8/VP8LayerSelector.cpp",
							"media-server/src/vp9/VP9PayloadDescription.cpp",
							"media-server/src/vp9/VP9LayerSelector.cpp",
							"media-server/src/vp9/VP9Depacketizer.cpp",
							"media-server/src/rtp.cpp",
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
							"media-server/src/rtp/RTCPCompoundPacket.cpp",
							"media-server/src/rtp/RTCPNACK.cpp",
							"media-server/src/rtp/RTCPReceiverReport.cpp",
							"media-server/src/rtp/RTCPSDES.cpp",
							"media-server/src/rtp/RTPPacketSched.cpp",
							"media-server/src/rtp/RTPStreamTransponder.cpp",
							"media-server/src/mp4recorder.cpp",
							"media-server/src/mp4streamer.cpp",
							"media-server/src/rtpsession.cpp",
							"media-server/src/RTPTransport.cpp",
							"media-server/src/PCAPFile.cpp",
							"media-server/src/remoteratecontrol.cpp",
							"media-server/src/remoterateestimator.cpp",
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
							    }]
						]
					},
					{
						"libraries"	: [ "<(external_libmediaserver)" ],
						"include_dirs"	: [ "<@(external_libmediaserver_include_dirs)" ]
					}
				]
			]
		}
	]
}

