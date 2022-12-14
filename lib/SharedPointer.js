function proxy(ret,cache)
{
	if (typeof ret === "object" && ret.constructor.name.match(/_exports_(.*)Shared/))
		return SharedPointer(ret,cache);
	return ret;
}
function wrap(func,cache)
{
	return function(...args)
	{
		return proxy(func(...args),cache)
	}
}

class Handler
{
	constructor()
	{
		//Cache for alreay created proxies
		this.cache = new WeakMap();
	}
	get(shared, prop)
	{
		if (typeof shared[prop] == "function")
			return wrap(shared[prop].bind(shared),this.cache);
		const ptr = shared.get();
		if (typeof ptr[prop] == "function")
			return wrap(ptr[prop].bind(ptr),this.cache);
		if (prop===SharedPointer.Target)
			return shared;
		if (prop===SharedPointer.Pointer)
			return ptr;
		return proxy(ptr[prop],this.cache);
	}
	set(shared, prop, value) {
		shared.get()[prop] = value;
		return true;
	}
};


function SharedPointer(obj, cache)
{
	//If we already have a proxy for that object
	if (cache && cache.has(obj))
		//Return 
		return cache.get(obj)
	//Create new proxy
	const proxy  = new Proxy(obj, new Handler());
	//Set it on cache
	if (cache) cache.set(obj,proxy);
	//Return proxy
	return proxy;

};

SharedPointer.Target = Symbol("target");
SharedPointer.Pointer = Symbol("pointer");


SharedPointer.wrapNativeModule = function (module)
{
	for (const [key,value] of Object.entries(module.exports))
		if (key.match(/Shared$/))
			module.exports[key] = function (...args) {
			return SharedPointer(new value(...args))
		}
}

module.exports = SharedPointer;






