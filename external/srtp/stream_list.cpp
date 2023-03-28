#include "stream_list_priv.h"
#include <unordered_set>

// SSRCs are generated randomly, so use a no-op hasher that just takes the SSRC as hash.
// regarding security concerns:
//  - for ingest we're only going to have a reduced number of streams anyway
//  - for cascading we choose the SSRCs ourselves so we know they're random

struct StreamHash
{
	size_t operator()(srtp_stream_t stream) const
	{
		return stream->ssrc;
	}
};

// we're going to save everything in the key to avoid repeating the SSRC,
// so we'll need a custom equality function as well

struct StreamEq
{
	bool operator()(srtp_stream_t a, srtp_stream_t b) const
	{
		return a->ssrc == b->ssrc;
	}
};

// for our use case, RAM isn't a problem so we can trade O(n) space for O(1) time.
// so, use a hash table (unordered_set)
// FIXME: tune load factor

struct srtp_stream_list_ctx_t {
	std::unordered_set<srtp_stream_t, StreamHash, StreamEq> streams;
};

// API implementation

srtp_err_status_t
srtp_stream_list_alloc(srtp_stream_list_t* list_ptr)
{
	(*list_ptr) = (srtp_stream_list_t) new srtp_stream_list_ctx_t;
	return srtp_err_status_ok;
}

srtp_err_status_t
srtp_stream_list_insert(srtp_stream_list_t list, srtp_stream_t stream)
{
	auto &streams = ((srtp_stream_list_ctx_t*)list)->streams;
	streams.insert(stream);
	return srtp_err_status_ok;
}

srtp_stream_t
srtp_stream_list_get(srtp_stream_list_t list, uint32_t ssrc)
{
	auto &streams = ((srtp_stream_list_ctx_t*)list)->streams;
	// build key
	srtp_stream_ctx_t key;
	key.ssrc = ssrc;
	// try to retrieve
	auto it = streams.find(&key);
	if (it == streams.end())
		return nullptr;
	// if successful, return
	return *it;
}

void
srtp_stream_list_remove(srtp_stream_list_t list, srtp_stream_t stream)
{
	auto &streams = ((srtp_stream_list_ctx_t*)list)->streams;
	// build key
	srtp_stream_ctx_t key;
	key.ssrc = stream->ssrc;
	streams.erase(&key);
}

void
srtp_stream_list_for_each(srtp_stream_list_t list, int (*callback)(srtp_stream_t, void *), void *data)
{
	auto &streams = ((srtp_stream_list_ctx_t*)list)->streams;

	for (auto it = streams.begin(); it != streams.end();)
	{
		if (callback(*it++, data))
			break;
	}
}

srtp_err_status_t
srtp_stream_list_dealloc(srtp_stream_list_t list)
{
	// deallocate our state
	delete ((srtp_stream_list_ctx_t*)list);
	return srtp_err_status_ok;
}
