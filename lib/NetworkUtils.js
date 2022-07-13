//@ts-check
const util = require('util');
const delay = util.promisify(setTimeout);


// Utilities to manipulate IPv4 addresses

/** parse a CIDR into a normalized [address as u32be, prefix length] tuple */
function parseCIDR(cidr)
{
	cidr = /^((?:\d+\.){3}\d+)\/(\d+)$/.exec(cidr);
	if (!cidr)
		throw Error(`invalid CIDR: ${cidr}`)
	const [addr, prefix] = [].slice.call(cidr, 1);
	const verifyRange = (x, max) => {
		x = parseInt(x);
		if (x > max)
			throw Error(`${x} exceeds ${max}`);
		return x;
	}
	const rawAddr = Buffer.from(addr.split('.').map(x => verifyRange(x, 255)));
	return [rawAddr.readUInt32BE(), verifyRange(prefix, 32)];
}

const cidrMask = (n) => (~0) << (32 - n);
const isInsidePrefix = (prefix, addr) => prefix[1] <= addr[1] && !((prefix[0] ^ addr[0]) & cidrMask(prefix[1]));
const isReservedAddress = (addr) => reservedRanges.some(range => isInsidePrefix(range, addr));

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

// use a single, shared socket for queries
/** @type {import('netlink').RtNetlinkSocket} */
let rtNetlink;

function ensureSharedSocket()
{
	if (rtNetlink)
		return;
	if (!netlink)
		throw Error('netlink unavailable or failed to import');
	rtNetlink = netlink.createRtNetlink();
}

// cache responses for a while, to avoid collapsing socket
/** @type {Map<string, ReturnType<typeof realGetInterfaceRawConfig>>} */
const rawConfigCache = new Map()

function getInterfaceRawConfig(name)
{
	let promise = rawConfigCache.get(name);
	if (!promise) {
		promise = realGetInterfaceRawConfig(name);
		rawConfigCache.set(name, promise);
		promise.then(() => delay(200), () => {}).then(() => rawConfigCache.delete(name));
	}
	return promise;
}

async function realGetInterfaceRawConfig(name)
{
	ensureSharedSocket();

	// fetch link
	const [ link ] = await rtNetlink.getLink({}, { ifname: name })
		.catch(error => { throw Error(`failed to find interface ${name}: ${error}`) });
	const { data: { index, type }, attrs: { address: lladdr } } = link;
	if (type !== 'ETHER')
		throw Error('not an Ethernet interface');
	if (!lladdr)
		throw Error('no physical address found on interface');

	// fetch IPv4 addresses
	let addrs = (await rtNetlink.getAddresses())
		.filter(addr => addr.data.family === 2 && addr.data.index === index)
		.map(addr => [ addr.attrs.address.readUInt32BE(), addr.data.prefixlen ]);
	if (addrs.length !== 1) {
		// try to discard reserved addresses and see if there's just 1 address left
		addrs = addrs.filter(x => !isReservedAddress(x));
	}
	if (addrs.length !== 1)
		throw Error('multiple IPv4 addresses found');
	const [ addr ] = addrs;

	// fetch IPv4 routes
	const [gRoute, lRoute, ...extraRoutes] = (await rtNetlink.getRoutes())
		.filter(route => route.data.family === 2 && route.attrs.oif === index && route.data.type === 'UNICAST')
		.sort((a, b) => Number(a.data.dstLen !== 0)); // guarantee gateway goes first
	const addrPrefix = (addr[0] & cidrMask(addr[1])) >>> 0;
	if (!(
		// some checks disabled for now since they don't play well since they're not flexible enough
		//extraRoutes.length === 0 &&
		gRoute.data.dstLen === 0 && gRoute.attrs.gateway &&
		true //lRoute.attrs.dst.readUint32BE() === addrPrefix && lRoute.data.dstLen === addr[1]
	))
		throw Error('unexpected route configuration');
	const gatewayAddr = gRoute.attrs.gateway.readUint32BE();

	// fetch ARP entries (FIXME: be a bit more robust, probe if not found)
	const neighbors = new Map((await rtNetlink.getNeighbors())
		.filter(neigh => neigh.data.family === 2 && neigh.data.ifindex === index && neigh.data.state.reachable)
		.map(neigh => [ neigh.attrs.dst.readUint32BE(), neigh.attrs.lladdr ]));
	const gatewayLladdr = neighbors.get(gatewayAddr);
	if (!gatewayLladdr)
		throw Error('gateway ARP entry not found');

	return { index, addr, lladdr, gatewayAddr, gatewayLladdr };
}


module.exports = {
	getInterfaceRawConfig : getInterfaceRawConfig,
};
