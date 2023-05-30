# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

{
  'variables': {
    'use_openssl%': 1,
  },
  'target_defaults': {
    'defines': [
      'HAVE_CONFIG_H',
      'HAVE_STDLIB_H',
      'HAVE_STRING_H',
      'TESTAPP_SOURCE',
      'GCM',
    ],
    'include_dirs': [
      './config',
      'lib/include',
      'lib/crypto/include',
    ],
    'conditions': [
      ['use_openssl==1', {
        'defines': [
          'OPENSSL',
        ],
      }],
      ['os_posix==1', {
        'defines': [
          'HAVE_INT16_T',
          'HAVE_INT32_T',
          'HAVE_INT8_T',
          'HAVE_UINT16_T',
          'HAVE_UINT32_T',
          'HAVE_UINT64_T',
          'HAVE_UINT8_T',
          'HAVE_STDINT_H',
          'HAVE_INTTYPES_H',
          'HAVE_NETINET_IN_H',
          'HAVE_ARPA_INET_H',
          'HAVE_UNISTD_H',
        ],
        'cflags': [
          '-g',
          '-Wno-unused-variable',
        ],
      }],
      ['OS=="win"', {
        'defines': [
          'HAVE_BYTESWAP_METHODS_H',
          # All Windows architectures are this way.
          'SIZEOF_UNSIGNED_LONG=4',
          'SIZEOF_UNSIGNED_LONG_LONG=8',
          'HAVE_WINSOCK2_H',
          'HAVE_WINDOWS_H',
         ],
         'msvs_disabled_warnings': [
            4018,  # signed/unsigned mismatch in comparison
          ],
      }],
      ['target_arch=="x64" or target_arch=="ia32"', {
        'defines': [
          'CPU_CISC',
	  'HAVE_X86'
        ],
      }],
      ['target_arch=="arm" or target_arch=="arm64" \
       or target_arch=="mipsel" or target_arch=="mips64el"', {
        'defines': [
          # TODO(leozwang): CPU_RISC doesn't work properly on android/arm and
          # mips platforms for unknown reasons, need to investigate the root
          # cause of it. CPU_RISC is used for optimization only, and CPU_CISC
          # should just work just fine, it has been tested on android/arm with
          # srtp test applications and libjingle.
          'CPU_CISC',
        ],
      }],
      ['target_arch=="mipsel" or target_arch=="arm" or target_arch=="ia32"', {
        'defines': [
          # Define FORCE_64BIT_ALIGN to avoid alignment-related-crashes like
          # crbug/414919. Without this, aes_cbc_alloc will allocate an
          # aes_cbc_ctx_t not 64-bit aligned and the v128_t members of
          # aes_cbc_ctx_t will not be 64-bit aligned, which breaks the
          # compiler optimizations that assume 64-bit alignment of v128_t.
          'FORCE_64BIT_ALIGN',
        ],
      }],
    ],
    'direct_dependent_settings': {
      'include_dirs': [
        './config',
        'lib/include',
        'lib/crypto/include',
      ],
      'conditions': [
        ['os_posix==1', {
          'defines': [
            'HAVE_INT16_T',
            'HAVE_INT32_T',
            'HAVE_INT8_T',
            'HAVE_UINT16_T',
            'HAVE_UINT32_T',
            'HAVE_UINT64_T',
            'HAVE_UINT8_T',
            'HAVE_STDINT_H',
            'HAVE_INTTYPES_H',
            'HAVE_NETINET_IN_H',
          ],
        }],
        ['OS=="win"', {
          'defines': [
            'HAVE_BYTESWAP_METHODS_H',
            # All Windows architectures are this way.
            'SIZEOF_UNSIGNED_LONG=4',
            'SIZEOF_UNSIGNED_LONG_LONG=8',
           ],
        }],
	['OS=="linux"', {
          'defines': [
            'HAVE_BYTESWAP_H',
           ],
        }],
        ['target_arch=="x64" or target_arch=="ia32"', {
          'defines': [
            'CPU_CISC',
          ],
        }],
      ],
    },
  },
  'targets': [
    {
      'target_name': 'libsrtp',
      'type': 'static_library',
      'sources': [
        # includes
        'lib/include/srtp.h',
        'lib/include/srtp_priv.h',
        'lib/include/stream_list_priv.h'

        # headers
        'lib/crypto/include/aes_gcm.h',
        'lib/crypto/include/aes.h',
        'lib/crypto/include/aes_icm_ext.h',
        'lib/crypto/include/aes_icm.h',
        'lib/crypto/include/alloc.h',
        'lib/crypto/include/auth.h',
        'lib/crypto/include/cipher.h',
        'lib/crypto/include/cipher_priv.h',
        'lib/crypto/include/cipher_types.h',
        'lib/crypto/include/crypto_kernel.h',
        'lib/crypto/include/crypto_types.h',
        'lib/crypto/include/datatypes.h',
        'lib/crypto/include/err.h',
        'lib/crypto/include/hmac.h',
        'lib/crypto/include/integers.h',
        'lib/crypto/include/key.h',
        'lib/crypto/include/null_auth.h',
        'lib/crypto/include/null_cipher.h',
        'lib/crypto/include/rdb.h',
        'lib/crypto/include/rdbx.h',
        'lib/crypto/include/sha1.h',

        # sources
        'lib/srtp/srtp.c',

        'lib/crypto/cipher/aes.c',
        'lib/crypto/cipher/aes_cbc.c',
        'lib/crypto/cipher/aes_icm.c',
        'lib/crypto/cipher/cipher.c',
        'lib/crypto/cipher/cipher_test_cases.c',
        'lib/crypto/cipher/null_cipher.c',
        'lib/crypto/hash/auth.c',
        'lib/crypto/hash/auth_test_cases.c',
        'lib/crypto/hash/hmac.c',
        'lib/crypto/hash/null_auth.c',
        'lib/crypto/hash/sha1.c',
        'lib/crypto/kernel/alloc.c',
        'lib/crypto/kernel/crypto_kernel.c',
        'lib/crypto/kernel/err.c',
        'lib/crypto/kernel/key.c',
        'lib/crypto/math/datatypes.c',
        'lib/crypto/replay/rdb.c',
        'lib/crypto/replay/rdbx.c',

        # stream list override
        'stream_list.cpp',

        # AES-GCM backend conditional override
        'gcm_aes_backend.cpp',
        'gcm_aes_backend-asm.S',
      ],
      'defines': [
        # override stream list
        'SRTP_NO_STREAM_LIST',
      ],
      'conditions': [
        ['use_openssl==1', {
          'sources!': [
            'lib/crypto/cipher/aes_cbc.c',
            'lib/crypto/cipher/aes_icm.c',
            'lib/crypto/hash/hmac.c',
            'lib/crypto/hash/sha1.c',
          ],
          'sources': [
            'aes_gcm_ossl.c', # 'lib/crypto/cipher/aes_gcm_ossl.c',
            'lib/crypto/cipher/aes_icm_ossl.c',
            'lib/crypto/hash/hmac_ossl.c',
            'lib/crypto/include/aes_gcm_ossl.h',
            'lib/crypto/include/aes_icm_ossl.h',
          ],
        }],
      ],
    },
  ], # targets
}
