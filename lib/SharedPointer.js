//@ts-nocheck

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


/**
 * @template {{ get(): any }} T
 * @typedef {T & ReturnType<T['get']>} Proxy
 *
 * objects returned by {@link SharedPointer} are proxies that
 * implement both the operations of the shared pointer itself
 * and of the pointed-to object. they can be used in place of
 * both.
 */

/**
 * @template {{ get(): any }} T
 * @returns {Proxy<T>}
 */
function SharedPointer(
	/** @type {T} */ obj,
	/** @type {Map<Object, Proxy<any>>} */ cache)
{
	//If what we get passed is already a proxy, return it unchanged
	if (obj[SharedPointer.Target])
		return obj;
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

/**
 * @template {{ get(): any }} T
 * @param {Proxy<T>} ptr
 * @returns {T}
 */
SharedPointer.getPointer = function (ptr)
{
	return ptr[SharedPointer.Pointer];
}



SharedPointer.wrapNativeModule = function (module)
{
	for (const [key,value] of Object.entries(module.exports))
		if (key.match(/Shared$/))
			module.exports[key] = function (...args) {
			return SharedPointer(new value(...args))
		}
}

module.exports = SharedPointer;
