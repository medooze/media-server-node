#include <string.h>
#include <memory>

extern "C" {
#include "crypto_types.h"
#include "cipher.h"
#include "lib/crypto/cipher/cipher_test_cases.h"
};

struct AesGcmSrtpBackend {
	// parameters saved from the alloc call
	size_t tag_len, key_size;

	// TODO: state

	static srtp_err_status_t alloc(srtp_cipher_t** cptr, int key_len, int tlen)
	{
		auto c = std::make_unique<srtp_cipher_t>();
		auto ctx = std::make_unique<AesGcmSrtpBackend>();

		// TODO: allocate state

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

	static srtp_err_status_t context_init(void* cv, const uint8_t* key)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		// TODO: init state

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t set_iv(void* cv, unsigned char* iv, srtp_cipher_direction_t /*direction*/)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		// TODO: set IV

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t set_aad(void* cv, const uint8_t* aad, uint32_t aad_len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		// TODO: process AAD

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t encrypt(void* cv, unsigned char* buf, unsigned int* enc_len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		// TODO: encrypt chunk

		return (srtp_err_status_ok);
	}

	static srtp_err_status_t get_tag(void* cv, uint8_t* buf, uint32_t* len)
	{
		auto c = static_cast<AesGcmSrtpBackend*>(cv);

		// TODO: finalize encryption and copy tag_len bytes to buf
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

		// decrypt buf / new_enc_len, finalize and check tag
		// TODO (fail with srtp_err_status_auth_fail if needed)

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
		srtp_replace_cipher_type(&backend_128, backend_128.id);
		srtp_replace_cipher_type(&backend_256, backend_256.id);
	}
};

// define the constexpr variables, for compatibility with pre-C++17
constexpr const srtp_cipher_type_t AesGcmSrtpBackend::backend_128;
constexpr const srtp_cipher_type_t AesGcmSrtpBackend::backend_256;

// call on startup to override libsrtp's default backend with ours
void AesGcmSrtpBackend_Register() {
	AesGcmSrtpBackend::Register();
}
