const util = require('util');
const dgram = require('dgram');
const events = require('events');

const be32 = (/** @type {number} */ x) => {
	if (x !== (x >>> 0))
		throw Error(`not a u32: ${x}`)
	const r = Buffer.alloc(4);
	r.writeUInt32BE(x);
	return r;
}
const be16 = (/** @type {number} */ x) => {
	if (x !== (x & 0xFFFF))
		throw Error(`not a u16: ${x}`)
	const r = Buffer.alloc(2);
	r.writeUInt16BE(x);
	return r;
}


// Utilities to manipulate MAC addresses

function formatMac(/** @type {Uint8Array} */ mac)
{
	if (!(mac instanceof Uint8Array && mac.length === 6))
		throw TypeError('invalid MAC address');
	return [...mac].map(x => x.toString(16).padStart(2, '0')).join(':');
}


// Utilities to manipulate IPv4 addresses

const verifyRange = (/** @type {string} */ xStr, /** @type {number} */ max) => {
	const x = parseInt(xStr);
	if (x > max)
		throw Error(`${x} exceeds ${max}`);
	return x;
}

/** parse a dot-separated IPv4 into a normalized address as u32be */
function parseIPv4(/** @type {string} */ ip)
{
	if (!/^(?:\d+\.){3}\d+$/.test(ip))
		throw Error(`invalid IPv4: ${ip}`);
	const rawAddr = Buffer.from(ip.split('.').map(x => verifyRange(x, 255)));
	return rawAddr.readUInt32BE();
}

/** @typedef {readonly [number, number]} CIDR */

/** parse a CIDR into a normalized [address as u32be, prefix length] tuple */
function parseCIDR(/** @type {string} */ cidr)
{
	if (!/^[^/]+\/\d+$/.exec(cidr))
		throw Error(`invalid CIDR: ${cidr}`);
	const [addr, prefix] = cidr.split('/');
	return /** @type {const} */ ([parseIPv4(addr), verifyRange(prefix, 32)]);
}

const cidrMask = (/** @type {number} */ n) => (~0) << (32 - n);
const isInsidePrefix = (/** @type {CIDR} */ prefix, /** @type {CIDR} */ addr) => prefix[1] <= addr[1] && !((prefix[0] ^ addr[0]) & cidrMask(prefix[1]));
const isReservedAddress = (/** @type {CIDR} */ addr) => reservedRanges.some(range => isInsidePrefix(range, addr));

const reservedRanges = [
	'0.0.0.0/8',
	'10.0.0.0/8',
	'100.64.0.0/10',
	'127.0.0.0/8',
	'169.254.0.0/16',
	'172.16.0.0/12',
	'192.0.0.0/24',
	'192.0.2.0/24',
	'192.88.99.0/24',
	'192.168.0.0/16',
	'198.18.0.0/15',
	'198.51.100.0/24',
	'203.0.113.0/24',
	'224.0.0.0/4',
	'233.252.0.0/24',
	'240.0.0.0/4',
	'255.255.255.255/32',
].map(parseCIDR);


// Utilities to query network configuration through Netlink
// (since this is only available on Linux, we must make sure
// to handle module not existing on other platforms)

const netlink = (() => {
	try {
		return require('netlink');
	} catch (e) {}
})();

/**
 * Create a dedicated socket on each query, no caching... it's inefficient
 * but more robust, we don't need to give user a way to invalidate the cache,
 * we don't need to be careful when managing refs, subscriptions...
 * @template T
 * @param {(socket: import('netlink').RtNetlinkSocket) => PromiseLike<T>} callback
 */
async function withSocket(callback)
{
	if (!netlink)
		throw Error('netlink unavailable or failed to import');
	const rtNetlink = netlink.createRtNetlink();
	try {
		return await callback(rtNetlink);
	} finally {
		rtNetlink.socket.close();
	}
}

/**
 * @typedef InterfaceRawConfig
 * @property {number} index Interface index (ifindex)
 * @property {string} lladdr MAC address
 * @property {readonly [number, string]} defaultRoute
 */

/**
 * get configuration of an interface by name
 * @returns {Promise<InterfaceRawConfig>}
 */
const getInterfaceRawConfig = (/** @type {string} */ name) => withSocket(async rtNetlink => {
	// fetch link
	const [ link ] = await rtNetlink.getLink({}, { ifname: name })
		.catch(error => { throw Error(`failed to find interface ${name}: ${error}`) });
	const { data: { index, type }, attrs: { address: lladdr } } =
		/** @type {(typeof link) & { data: { index: number } }} */ (link);
	if (type !== 'ETHER')
		throw Error('not an Ethernet interface');
	if (!lladdr)
		throw Error('no physical address found on interface');

	// fetch IPv4 routes, find default route, check there's a gateway, resolve it
	const routes = (await rtNetlink.getRoutes())
		.filter(route => route.data.family === 2 && route.attrs.oif === index && route.data.type === 'UNICAST') // filter ourselves, kernel seems to be buggy
		.filter(route => route.data.dstLen === 0 && route.attrs.gateway);
	const defaultRoute = routes.length ? 
		(await collectRoutingInfoWithRoute(rtNetlink, index, routes[0], routes[0].attrs.gateway.readUInt32BE())) :
		/** @type {const} */ ([ 0, '00:00:00:00:00:00' ]); // silently give an invalid value

	return { index, lladdr: formatMac(lladdr), defaultRoute };
});

const IPPROTO_UDP = 17

/** @type {<T>(list: T[], name: string) => T | Promise<T>} */
const extractOne = (list, name) =>
	list.length === 1 ? list[0] : Promise.reject(`expected one ${name}, ${list.length} returned`);

const collectCandidateInfo = (
	/** @type {string} */ ipStr,
	/** @type {number} */ port,
	/** @type {number} */ ifindex,
) => withSocket(async rtNetlink => {
	const ip = parseIPv4(ipStr);


	// PART 1: perform a FIB lookup to see where Linux routes this candidate at.
	// to handle weird setups as good as possible, it's important to pass all
	// relevant info (protocol, destination port, ToS, mark, UID...)

	const route = await rtNetlink.getRoute(
		{ family: 2, flags: { fibMatch: true } },
		{ dst: be32(ip), ipProto: Buffer.of(IPPROTO_UDP), dport: be16(port) })
		.then(
			res => extractOne(res, 'route'),
			err => Promise.reject(new Error(`routing failed: ${err}`))
		);

	const { attrs: { gateway, oif } } = route;

	// reject if the candidate would be routed to a different interface.
	// in addition to this, we could force the FIB lookup to use a specific
	// output interface (in case the machine has multiple WANs, for instance)
	if (oif !== ifindex)
		throw Error(`candidate would be routed to interface ${oif}, not ${ifindex}`)

	// deciding the next hop from the matched route isn't straightforward. there
	// are lots of edge cases for historical reasons, and apparently no way for
	// us to ask Linux so we need to replicate it. we'll just skip most of the
	// edge cases so this should be good enough
	const dst = gateway !== undefined ? gateway.readUInt32BE() : ip;

	return await collectRoutingInfoWithRoute(rtNetlink, ifindex, route, dst);
});

/**
 * Continuation of collectRoutingInfo once a route has been
 * selected (split to allow reusal from getInterfaceRawConfig).
 * 
 * @param {import('netlink').RtNetlinkSocket} rtNetlink
 * @param {number} ifindex Interface
 * @param {import('netlink').rt.RouteMessage} route Selected route
 * @param {number} dst Resolved next hop address for route
 * @returns {Promise<readonly [number, string]>} selected route as a (source IP, destination MAC) tuple
 */
const collectRoutingInfoWithRoute = async (rtNetlink, ifindex, route, dst) => {
	const { data: { scope }, attrs: { prefsrc } } = route;

	// as for source: to replicate Linux we should use prefsrc if present, otherwise
	// inet_select_addr() is called, which we are somehow imitating here
	let src = prefsrc && prefsrc.readUInt32BE();
	if (!src) {
		const localnetScope = netlink.rt.RouteScope.HOST;
		const parseAddress = addr => [ addr.attrs.address.readUInt32BE(), addr.data.prefixlen ]
		const addresses = await rtNetlink.getAddresses({ family: 2, index: ifindex });
		const matches = addresses.filter(addr => 
			!addr.data.flags.secondary &&
			Math.min(addr.data.scope, localnetScope) <= netlink.rt.RouteScope[scope] &&
			isInsidePrefix(parseAddress(addr), [dst, 32]));
		const selected = matches[0] || addresses[0];
		if (!selected)
			throw Error('source selection failed');
		src = selected.attrs.local.readUInt32BE();
	}


	// PART 2: obtain MAC of next hop

	// subscribe to neighbor table updates (make sure to ref socket to hold loop alive)
	rtNetlink.socket.ref();
	rtNetlink.socket.addMembership(netlink.rt.MulticastGroups.NEIGH);

	// once subscription is active, obtain current ARP entry (if any)
	let entry = await rtNetlink.getNeighbor({ family: 2, ifindex }, { dst: be32(dst) })
		.then(
			res => extractOne(res, 'neighbor'),
			err => (err && err.message === 'Request rejected: ENOENT') ? undefined : Promise.reject(err)
		);

	// if needed, trigger an ARP probe
	let state = entry && entry.data.state;
	if (!state) {
		const udpSocket = dgram.createSocket('udp4');
		udpSocket.connect(1, be32(dst).join('.'));
		await events.once(udpSocket, 'connect');
		await util.promisify(cb => udpSocket.send('', cb))();

		// re-obtain the entry, should now be in probing state
		entry = await rtNetlink.getNeighbor({ family: 2, ifindex }, { dst: be32(dst) })
			.then(res => extractOne(res, 'neighbor'));
	}

	// if needed, wait until (re)probing finishes
	while (state = entry && entry.data.state, state && (state.incomplete || state.probe)) {
		// wait for next update of this entry
		while (true) {
			const [msg] = await events.once(rtNetlink, 'message');
			entry = msg.find(msg =>
				msg.kind === 'neighbor' && msg.data.family === 2 && msg.data.ifindex === ifindex &&
				msg.attrs.dst.readUInt32BE() === dst);
			if (entry) break;
		}
	}

	// check result of probe
	state = entry && entry.data.state;
	if (state && (state.failed || state.noarp))
		throw Error('ARP probe failed');
	if (state && (state.permanent || state.reachable || state.stale || state.delay))
		return [ src, formatMac(entry.attrs.lladdr) ];
	throw Error(`unexpected ARP state: ${util.inspect(state)}`);
};


module.exports = {
	getInterfaceRawConfig : getInterfaceRawConfig,
	collectCandidateInfo : collectCandidateInfo,
};
