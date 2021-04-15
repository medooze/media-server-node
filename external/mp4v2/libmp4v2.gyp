{
	"variables": 
	{
		"target_arch%": "x64"
	},
	"target_defaults": 
	{
		"default_configuration": "Release",
		"configurations": 
		{
			"Release": 
			{
				"defines": [ "NDEBUG" ]
			}
		}
	},
	"targets": 
	[
		{
			"target_name": "mp4v2",
			"product_prefix": "lib",
			"type": "static_library",
			'conditions': [
				[ 'OS=="mac"', {

					'xcode_settings': {
						'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
						'WARNING_CFLAGS': [ '-Wno-reserved-user-defined-literal' ]
					},
				},
				{
						       "cflags!": [ "-fno-exceptions"],
						       "cflags_cc!": [ "-fno-exceptions"],
						       "cflags": [ "-Wno-unknown-warning-option -Wno-literal-suffix -Wno-reserved-user-defined-literal" ],
						       "cflags_cc": [ "-Wno-unknown-warning-option -Wno-literal-suffix -Wno-reserved-user-defined-literal" ]
				}

				]
			],
			"include_dirs": 
			[
				"./config",
				"./config/include",
				"./lib",
				"./lib/include"
			],
			"sources": 
			[ 
				"./lib/libplatform/io/FileSystem_posix.cpp",
				"./lib/libplatform/io/FileSystem.cpp",
				"./lib/libplatform/io/File.cpp",
				"./lib/libplatform/io/File_posix.cpp",
				"./lib/libplatform/time/time_posix.cpp",
				"./lib/libplatform/time/time.cpp",
				"./lib/libplatform/process/process_posix.cpp",
				"./lib/libplatform/prog/option.cpp",
				"./lib/libplatform/number/random_posix.cpp",
				"./lib/libplatform/sys/error.cpp",
				"./lib/src/atom_mdat.cpp",
				"./lib/src/atom_d263.cpp",
				"./lib/src/atom_nmhd.cpp",
				"./lib/src/atom_dref.cpp",
				"./lib/src/atom_tx3g.cpp",
				"./lib/src/atom_text.cpp",
				"./lib/src/atom_mvhd.cpp",
				"./lib/src/atom_stbl.cpp",
				"./lib/src/atom_sdtp.cpp",
				"./lib/src/atom_ac3.cpp",
				"./lib/src/atom_gmin.cpp",
				"./lib/src/atom_pasp.cpp",
				"./lib/src/mp4info.cpp",
				"./lib/src/ocidescriptors.cpp",
				"./lib/src/exception.cpp",
				"./lib/src/atom_stz2.cpp",
				"./lib/src/mp4file.cpp",
				"./lib/src/atom_url.cpp",
				"./lib/src/atom_vpcC.cpp",
				"./lib/src/atom_smi.cpp",
				"./lib/src/atom_encv.cpp",
				"./lib/src/mp4.cpp",
				"./lib/src/isma.cpp",
				"./lib/src/odcommands.cpp",
				"./lib/src/bmff/typebmff.cpp",
				"./lib/src/atom_udta.cpp",
				"./lib/src/atom_meta.cpp",
				"./lib/src/mp4property.cpp",
				"./lib/src/atom_sound.cpp",
				"./lib/src/atom_hinf.cpp",
				"./lib/src/atom_mdhd.cpp",
				"./lib/src/atom_tfhd.cpp",
				"./lib/src/atom_s263.cpp",
				"./lib/src/atom_video.cpp",
				"./lib/src/atom_urn.cpp",
				"./lib/src/atom_colr.cpp",
				"./lib/src/atom_stsz.cpp",
				"./lib/src/atom_damr.cpp",
				"./lib/src/atom_rtp.cpp",
				"./lib/src/atom_chpl.cpp",
				"./lib/src/atom_treftype.cpp",
				"./lib/src/atom_uuid.cpp",
				"./lib/src/atom_enca.cpp",
				"./lib/src/atom_ftab.cpp",
				"./lib/src/atom_mp4v.cpp",
				"./lib/src/mp4file_io.cpp",
				"./lib/src/atom_free.cpp",
				"./lib/src/atom_ftyp.cpp",
				"./lib/src/atom_vpxx.cpp",
				"./lib/src/descriptors.cpp",
				"./lib/src/rtphint.cpp",
				"./lib/src/atom_dops.cpp",
				"./lib/src/3gp.cpp",
				"./lib/src/atom_ohdr.cpp",
				"./lib/src/atom_tkhd.cpp",
				"./lib/src/atom_root.cpp",
				"./lib/src/itmf/generic.cpp",
				"./lib/src/itmf/CoverArtBox.cpp",
				"./lib/src/itmf/type.cpp",
				"./lib/src/itmf/Tags.cpp",
				"./lib/src/atom_amr.cpp",
				"./lib/src/atom_dac3.cpp",
				"./lib/src/cmeta.cpp",
				"./lib/src/mp4track.cpp",
				"./lib/src/atom_sdp.cpp",
				"./lib/src/atom_stsd.cpp",
				"./lib/src/mp4atom.cpp",
				"./lib/src/mp4container.cpp",
				"./lib/src/atom_elst.cpp",
				"./lib/src/mp4descriptor.cpp",
				"./lib/src/mp4util.cpp",
				"./lib/src/qosqualifiers.cpp",
				"./lib/src/atom_hdlr.cpp",
				"./lib/src/atom_hnti.cpp",
				"./lib/src/atom_standard.cpp",
				"./lib/src/atom_trun.cpp",
				"./lib/src/atom_mp4s.cpp",
				"./lib/src/log.cpp",
				"./lib/src/atom_href.cpp",
				"./lib/src/atom_vmhd.cpp",
				"./lib/src/atom_opus.cpp",
				"./lib/src/atom_stdp.cpp",
				"./lib/src/atom_avc1.cpp",
				"./lib/src/qtff/PictureAspectRatioBox.cpp",
				"./lib/src/qtff/coding.cpp",
				"./lib/src/qtff/ColorParameterBox.cpp",
				"./lib/src/atom_avcC.cpp",
				"./lib/src/atom_stsc.cpp",
				"./lib/src/text.cpp"
			]
		}
	]
}
