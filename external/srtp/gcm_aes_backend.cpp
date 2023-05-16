/*
 * Copyright 2023 Dolby Laboratories.
 * Copyright 2009-2022 The OpenSSL Project Authors. All Rights Reserved.
 * Copyright (c) 2021, Intel Corporation. All Rights Reserved.
 *
 * Code adapted from OpenSSL @ 4f373a9773:
 *  <providers/implementations/ciphers/cipher_aes_gcm_hw_vaes_avx512.inc>
 *  <include/crypto/modes.h> (struct gcm128_context)
 *  <include/openssl/aes.h> (struct aes_key_st)
 *  <include/crypto/aes_platform.h> (aesni_set_encrypt_key prototype)
 *  <crypto/cpuid.c> (OPENSSL_ia32cap_P, OPENSSL_ia32_cpuid prototype)
 */

#include "gcm_aes_backend.h"
#include <cstdint>
#include <string.h>
#include <memory>
#include <openssl/crypto.h> // CRYPTO_memcmp

// ASM interface for crypto/x86_64cpuid

typedef uint64_t IA32CAP;

extern unsigned int AesGcmSrtpBackend_ia32cap_P[4];

extern "C" {
	IA32CAP AesGcmSrtpBackend_asm_ia32_cpuid(unsigned int *cap);
};

static void setupCaps() {
	auto vec = AesGcmSrtpBackend_asm_ia32_cpuid(AesGcmSrtpBackend_ia32cap_P);

	/*
	 * |(1<<10) sets a reserved bit to signal that variable
	 * was initialized already... This is to avoid interference
	 * with cpuid snippets in ELF .init segment.
	 */
	AesGcmSrtpBackend_ia32cap_P[0] = (unsigned int)vec | (1 << 10);
	AesGcmSrtpBackend_ia32cap_P[1] = (unsigned int)(vec >> 32);
}

// ASM interface for aesni-x86_64.pl

#define AES_MAXNR 14

struct aes_key_st {
	uint32_t rd_key[4 * (AES_MAXNR + 1)];
	int rounds;
};

extern "C" {
	int AesGcmSrtpBackend_asm_aesni_set_encrypt_key(const unsigned char *userKey, int bits, aes_key_st *key);
};

// ASM interface for aes-gcm-avx512.pl

struct gcm128_context {
	// see "Offsets in gcm128_context structure" in <crypto/modes/asm/aes-gcm-avx512.pl>
	union {
		uint64_t u[2];
		uint32_t d[4];
		uint8_t c[16];
		size_t t[16 / sizeof(size_t)];
	} Yi, EKi, EK0, len, Xi, H, Htable[16];
};

extern "C" {
	/* Returns non-zero when AVX512F + VAES + VPCLMULDQD combination is available */
	int AesGcmSrtpBackend_asm_vpclmulqdq_capable(void);

#define OSSL_AES_GCM_UPDATE(direction) \
	void AesGcmSrtpBackend_asm_ ## direction ## _avx512( \
		const aes_key_st *ks, \
		gcm128_context *ctx, \
		unsigned int *pblocklen, \
		const unsigned char *in, \
		size_t len, \
		unsigned char *out \
	);

	OSSL_AES_GCM_UPDATE(encrypt)
	OSSL_AES_GCM_UPDATE(decrypt)

	void AesGcmSrtpBackend_asm_init_avx512(const aes_key_st *ks, gcm128_context *ctx);
	void AesGcmSrtpBackend_asm_setiv_avx512(const aes_key_st *ks, gcm128_context *ctx, const unsigned char *iv, size_t ivlen);
	void AesGcmSrtpBackend_asm_update_aad_avx512(gcm128_context *ctx, const unsigned char *aad, size_t aadlen);
	void AesGcmSrtpBackend_asm_finalize_avx512(gcm128_context *ctx, unsigned int pblocklen);

	void AesGcmSrtpBackend_asm_gmult_avx512(uint64_t Xi[2], const gcm128_context *ctx);
};

// libsrtp backend interface

extern "C" {
#include "crypto_types.h"
#include "cipher.h"
#include "lib/crypto/cipher/cipher_test_cases.h"
};

// while ASM has code to handle partial blocks when encrypting/decrypting,
// it doesn't handle them for AAD. declare a wrapper for update_aad to do it:

#define AES_BLOCK_SIZE 16

static void update_aad_wrapper(gcm128_context *gcmctx, unsigned int* pblocklen, const unsigned char *aad, size_t aad_len)
{
	auto& ares = *pblocklen;

	/* Partial AAD block left from previous AAD update calls */
	if (ares > 0) {
		/*
		 * Fill partial block buffer till full block
		 * (note, the hash is stored reflected)
		 */
		while (ares > 0 && aad_len > 0) {
			gcmctx->Xi.c[15 - ares] ^= *(aad++);
			--aad_len;
			ares = (ares + 1) % AES_BLOCK_SIZE;
		}
		/* Full block gathered */
		if (ares == 0) {
			AesGcmSrtpBackend_asm_gmult_avx512(gcmctx->Xi.u, gcmctx);
		} else { /* no more AAD */
			return;
		}
	}

	/* Bulk AAD processing */
	auto lenBlks = aad_len & ((size_t)(-AES_BLOCK_SIZE));
	if (lenBlks > 0) {
		AesGcmSrtpBackend_asm_update_aad_avx512(gcmctx, aad, lenBlks);
		aad += lenBlks;
		aad_len -= lenBlks;
	}

	/* Add remaining AAD to the hash (note, the hash is stored reflected) */
	if (aad_len > 0) {
		ares = aad_len;
		for (size_t i = 0; i < aad_len; i++)
			gcmctx->Xi.c[15 - i] ^= aad[i];
	}
}


// backend implementation

#define BAD_SEQUENCE (srtp_err_status_bad_param)

struct AesGcmSrtpBackend {
	// state guards
	bool has_key, has_iv;
	srtp_cipher_direction_t direction;

	// parameters saved from the alloc call
	size_t tag_len, key_size;

	// cipher state
	gcm128_context gcm_state;
	aes_key_st key_state;
	unsigned int ares, mres; // partial block fill (bytes) for AAD and payload

	// ALLOCATION / DEALLOCATION

	static srtp_err_status_t alloc(srtp_cipher_t** cptr, int key_len, int tlen)
	{
		auto c = std::make_unique<srtp_cipher_t>();
		auto ctx = std::make_unique<AesGcmSrtpBackend>();

		if (tlen != 8 && tlen != 16) {
			return (srtp_err_status_bad_param);
		}
		ctx->tag_len = tlen;

		if (key_len == SRTP_AES_GCM_128_KEY_LEN_WSALT) {
			c->type = &backend_128;
			ctx->key_size = SRTP_AES_128_KEY_LEN;
		} else if (key_len == SRTP_AES_GCM_256_KEY_LEN_WSALT) {
			c->type = &backend_256;
			ctx->key_size = SRTP_AES_256_KEY_LEN;
		} else {
			return (srtp_err_status_bad_param);
		}
		c->key_len = key_len;

		ctx->has_key = false;
		c->algorithm = c->type->id;
		c->state = ctx.release();
		*cptr = c.release();
		return (srtp_err_status_ok);
	}

	static srtp_err_status_t dealloc(srtp_cipher_t* c)
	{
		auto ctx = static_cast<AesGcmSrtpBackend*>(c->state);

		// zeroize the key material
		memset(ctx, 0, sizeof(*ctx));

		delete ctx;
		delete c;
		return (srtp_err_status_ok);
	}

	// INIT

	static srtp_err_status_t context_init(void* cv, const uint8_t* key)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		AesGcmSrtpBackend_asm_aesni_set_encrypt_key(key, c->key_size * 8, &c->key_state);
		memset(&c->gcm_state, 0, sizeof(c->gcm_state));
		AesGcmSrtpBackend_asm_init_avx512(&c->key_state, &c->gcm_state);

		c->has_key = true;
		c->has_iv = false;
		return (srtp_err_status_ok);
	}

	static srtp_err_status_t set_iv(void* cv, unsigned char* iv, srtp_cipher_direction_t direction)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);
		if (!c->has_key)
			return BAD_SEQUENCE;
		if (direction != srtp_direction_decrypt && direction != srtp_direction_encrypt)
			return srtp_err_status_bad_param;

		c->gcm_state.Yi.u[0] = 0;           /* Current counter */
		c->gcm_state.Yi.u[1] = 0;
		c->gcm_state.Xi.u[0] = 0;           /* AAD hash */
		c->gcm_state.Xi.u[1] = 0;
		c->gcm_state.len.u[0] = 0;          /* AAD length */
		c->gcm_state.len.u[1] = 0;          /* Message length */
		c->ares = 0;
		c->mres = 0;

		AesGcmSrtpBackend_asm_setiv_avx512(&c->key_state, &c->gcm_state, iv, 12);

		c->direction = direction;
		c->has_iv = true;
		return (srtp_err_status_ok);
	}

	// CORE CIPHER

	static srtp_err_status_t _try_increment_length(uint64_t& len_var, size_t len, uint64_t limit)
	{
		auto new_len = len_var + len;
		// AAD is limited by 2^64 bits, thus 2^61 bytes
		if (new_len > limit || new_len < len)
			return (srtp_err_status_algo_fail);

		len_var = new_len;
		return (srtp_err_status_ok);
	}

	static srtp_err_status_t set_aad(void* cv, const uint8_t* buf, uint32_t len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);
		if (!c->has_iv || c->gcm_state.len.u[1] > 0)
			return BAD_SEQUENCE;

		if (auto r = _try_increment_length(c->gcm_state.len.u[0], len, uint64_t(1) << 61))
			return r;
		update_aad_wrapper(&c->gcm_state, &c->ares, buf, len);

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t _update(void* cv, unsigned char* buf, unsigned int len, srtp_cipher_direction_t direction)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);
		if (!c->has_iv || direction != c->direction)
			return BAD_SEQUENCE;

		// Finalize GHASH(AAD) if AAD partial blocks left unprocessed
		if (c->ares > 0) {
			AesGcmSrtpBackend_asm_gmult_avx512(c->gcm_state.Xi.u, &c->gcm_state);
			c->ares = 0;
		}

		if (auto r = _try_increment_length(c->gcm_state.len.u[1], len, (uint64_t(1) << 36) - 32))
			return r;
		if (direction == srtp_direction_encrypt)
			AesGcmSrtpBackend_asm_encrypt_avx512(&c->key_state, &c->gcm_state, &c->mres, buf, len, buf);
		else
			AesGcmSrtpBackend_asm_decrypt_avx512(&c->key_state, &c->gcm_state, &c->mres, buf, len, buf);

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t _finalize(void *cv)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);
		if (!c->has_iv)
			return BAD_SEQUENCE;

		auto res = c->mres;
		// Finalize AAD processing
		if (c->ares > 0)
			res = c->ares;
		AesGcmSrtpBackend_asm_finalize_avx512(&c->gcm_state, res);

		c->has_iv = false;
		return (srtp_err_status_ok);
	}

	// SRTP-SPECIFIC LOGIC

	static srtp_err_status_t encrypt(void* cv, unsigned char* buf, unsigned int* enc_len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		if (auto r = _update(cv, buf, *enc_len, srtp_direction_encrypt))
			return r;

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t get_tag(void* cv, uint8_t* buf, uint32_t* len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);
		if (c->direction != srtp_direction_encrypt)
			return BAD_SEQUENCE;

		if (auto r = _finalize(cv))
			return r;
		memcpy(buf, c->gcm_state.Xi.c, c->tag_len);
		*len = c->tag_len;

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t decrypt(void* cv, uint8_t* buf, unsigned int* enc_len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);
		size_t new_enc_len = *enc_len;

		// extract tag from end of buffer
		if (new_enc_len < c->tag_len)
			return (srtp_err_status_auth_fail);
		new_enc_len -= c->tag_len;
		auto tag = buf + new_enc_len;

		if (auto r = _update(cv, buf, new_enc_len, srtp_direction_decrypt))
			return r;
		if (auto r = _finalize(cv))
			return r;
		if (CRYPTO_memcmp(c->gcm_state.Xi.c, tag, c->tag_len))
			return (srtp_err_status_auth_fail);

		*enc_len = new_enc_len;
		return (srtp_err_status_ok);
	}

	static constexpr const srtp_cipher_type_t backend_128 = {
		alloc,
		dealloc,
		context_init,
		set_aad,
		encrypt,
		decrypt,
		set_iv,
		get_tag,
		"AES-128 GCM optimized AVX-512 impl",
		&srtp_aes_gcm_128_test_case_0,
		SRTP_AES_GCM_128,
	};

	static constexpr const srtp_cipher_type_t backend_256 = {
		alloc,
		dealloc,
		context_init,
		set_aad,
		encrypt,
		decrypt,
		set_iv,
		get_tag,
		"AES-256 GCM optimized AVX-512 impl",
		&srtp_aes_gcm_256_test_case_0,
		SRTP_AES_GCM_256,
	};

	static void Register() {
		setupCaps();
		if (!AesGcmSrtpBackend_asm_vpclmulqdq_capable())
			return; // hardware support not available, fall back to normal backend
		srtp_replace_cipher_type(&backend_128, backend_128.id);
		srtp_replace_cipher_type(&backend_256, backend_256.id);
	}
};

// define the constexpr variables, for compatibility with pre-C++17
constexpr const srtp_cipher_type_t AesGcmSrtpBackend::backend_128;
constexpr const srtp_cipher_type_t AesGcmSrtpBackend::backend_256;

// call on startup to conditionally override libsrtp's default backend with ours
void AesGcmSrtpBackend_Register() {
	AesGcmSrtpBackend::Register();
}
