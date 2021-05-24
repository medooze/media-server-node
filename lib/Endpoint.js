const Native				= require("./Native");
const EventEmitter			= require('events').EventEmitter;
const Transport				= require("./Transport");
const PeerConnectionServer		= require("./PeerConnectionServer");
const SDPManagerUnified			= require("./SDPManagerUnified");
const SDPManagerPlanB			= require("./SDPManagerPlanB");
const IncomingStream			= require("./IncomingStream");
const IncomingStreamTrackMirrored	= require("./IncomingStreamTrackMirrored");
	
const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Setup		= SemanticSDP.Setup;

/**
 * An endpoint represent an UDP server socket.
 * The endpoint will process STUN requests in order to be able to associate the remote ip:port with the registered transport and forward any further data comming from that transport.
 * Being a server it is ICE-lite.
 */
class Endpoint 
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(ip)
	{
		//Store ip address of the endpoint
		this.ips = Array.isArray(ip) ? ip : [ip];
		//Create native endpoint
		this.bundle = new Native.RTPBundleTransport();
		//Start it
		this.bundle.Init();
		//Store all transports
		this.transports = new Set();
		//Create candidates 
		this.candidates = [];
		//Create candidates
		for (let i=0; i<this.ips.length; i++) 
		{
			//Calculate priority in descending order
			let priority = Math.pow(2,24)*126 + Math.pow(2,8)*(65535-i) + 255;
			//Add new RTP UPD local candidate
			this.candidates.push(new CandidateInfo("1", 1, "UDP", priority, this.ips[i], this.bundle.GetLocalPort(), "host"));
		}
		//Get fingerprint (global at media server level currently)
		this.fingerprint = Native.MediaServer.GetFingerprint().toString();

		
		//Create event emitter
		this.emitter = new EventEmitter();
		
		//Mirrored streams and tracks
		this.mirrored = {
			streams : new WeakMap(),
			tracks	: new WeakMap(),
			mirrors : new Set()
		};
	}
	
	/**
	 * Set cpu affinity for udp send/recv thread.
	 * @param {Number}  cpu - CPU core or -1 to reset affinity.
	 * @returns {boolean} 
	 */
	setAffinity(cpu)
	{
		//Set cpu affinity
		return this.bundle.SetAffinity(parseInt(cpu));
	}
	
	/**
	 * Set ICE timeout for outgoing ICE binding requests
	 * @param {Number}  timeout - Ammount of time in milliseconds between ICE binding requests 
	 */
	setIceTimeout(timeout)
	{
		//Set it
		return this.bundle.SetIceTimeout(timeout);
	}
	
	/**
	 * Create a new transport object and register it with the remote ICE username and password
	 * @param {Object|SDPInfo}  remoteInfo	- Remote ICE and DTLS properties
	 * @param {Object|ICEInfo}  remote.ice	- Remote ICE info, containing the username and password.
	 * @param {Object|DTLSInfo} remote.dtls	- Remote DTLS info
	 * @param {Array.CandidateInfo|Array.Object} remote.candidates - Remote ICE candidate info
	 * @param {Object}   localInfo		- Local ICE and DTLS properties (optional)
	 * @param {ICEInfo}  local.ice		- Local ICE info, containing the username and password. Local ICE candidates list is not really used at all.
	 * @param {DTLSInfo} local.dtls		- Local DTLS info
	 * @param {Array.CandidateInfo} local.candidates - Local candidate info
	 * @param {Object} options		- Dictionary with transport properties
	 * @param {boolean} options.disableSTUNKeepAlive - Disable ICE/STUN keep alives, required for server to server transports
	 * @param {String} options.srtpProtectionProfiles - Colon delimited list of SRTP protection profile names
	 * @param {String} options.overrideBWE - Override BWE reported by REMB
	 * @returns {Transport}	New transport object
	 */
	createTransport(remoteInfo, localInfo, options)
	{
		//Check we have a transport alredy
		if (!this.bundle)
			//Error
			throw new Error("Endpoint is alredy stopped, cannot create transport");
		
		//Support both plain js object and SDPInfo
		if (remoteInfo.constructor.name === "SDPInfo")
			//Convert
			remoteInfo = {
				dtls		: remoteInfo.getDTLS(),
				ice		: remoteInfo.getICE(),
				candidates	: remoteInfo.getCandidates()
			};
		
		//Ensure that we have the correct params
		if (!remoteInfo || !remoteInfo.ice || !remoteInfo.dtls)
			//Error
			throw new Error("No remote ICE or DTLS info provided");
		
		//Create remote properites
		const remote = {
			dtls		: remoteInfo.dtls.constructor.name === "DTLSInfo" ? remoteInfo.dtls.clone() : DTLSInfo.expand(remoteInfo.dtls),
			ice		: remoteInfo.ice .constructor.name === "ICEInfo"  ? remoteInfo.ice.clone()  : ICEInfo.expand(remoteInfo.ice),
			candidates	: []
		};
		
		//Add all remote candidates
		for (let i=0;remoteInfo.candidates && i<remoteInfo.candidates.length; ++i)
			//Clone
			remote.candidates.push(remoteInfo.candidates[i].constructor.name === "CandidateInfo"? remoteInfo.candidates[i].clone() : CandidateInfo.expand(remoteInfo.candidates[i]));

		//If there is no local info
		if (!localInfo)
		{
			//Generate one
			localInfo = {
				ice		: ICEInfo.generate(true),
				dtls		: new DTLSInfo(Setup.reverse(remoteInfo.dtls.getSetup()),"sha-256",this.fingerprint),
				candidates	: this.candidates
			};
		//If it is an SDPInfo object
		} else if (localInfo.constructor.name === "SDPInfo") {
			//Convert
			localInfo = {
				dtls		: localInfo.getDTLS(),
				ice		: localInfo.getICE(),
				candidates	: localInfo.getCandidates()
			};
		} 
		
		
		//Create local properites
		const local = {
			dtls		: localInfo.dtls.constructor.name === "DTLSInfo" ? localInfo.dtls.clone() : DTLSInfo.expand(localInfo.dtls),
			ice		: localInfo.ice.constructor.name === "ICEInfo"  ? localInfo.ice.clone()  : ICEInfo.expand(localInfo.ice),
			candidates	: []
		};
		
		//Add all local candidates
		for (let i=0;localInfo.candidates && i<localInfo.candidates.length; ++i)
			//Clone
			local.candidates.push(localInfo.candidates[i].constructor.name === "CandidateInfo" ? localInfo.candidates[i].clone() : CandidateInfo.expand(localInfo.candidates[i]));
		
		//Set lite nd end of candidates to ICE info
		local.ice.setLite(true);
		local.ice.setEndOfCandidates(true);

		//Create native tranport and return wrapper
		const transport = new Transport(this.bundle,remote, local, Object.assign({
				 disableSTUNKeepAlive : false,
				 srtpProtectionProfiles : ""
			}, options)
		);
		
		//Store it
		this.transports.add(transport);
		
		//Add us to ended
		transport.once("stopped", (transport) => {
			//Remove transport from set
			this.transports.delete(transport);
		});
		
		//Done
		return transport;
	}
	/**
	 * Get local ICE candidates for this endpoint. It will be shared by all the transport associated to this endpoint.
	 * @returns {Array.CandidateInfo}
	 */
	getLocalCandidates() 
	{
		//Return local host candiadate as array
		return this.candidates;
	}
	
	
	/**
	 * Get local DTLS fingerprint for this endpoint. It will be shared by all the transport associated to this endpoint.
	 * @returns {String}
	 */
	getDTLSFingerprint()
	{
		return this.fingerprint;
	}
	
	/**
	 * Helper that creates an offer from capabilities
	 * It generates a random ICE username and password and gets endpoint fingerprint
	 * @param {Object} capabilities - Media capabilities as required by SDPInfo.create
	 * @returns {SDPInfo} - SDP offer
	 */
	createOffer(capabilities)
	{
		//Create offer
		return SDPInfo.create({
			dtls		: new DTLSInfo(Setup.ACTPASS,"sha-256",this.fingerprint),
			ice		: ICEInfo.generate(true),
			candidates	: this.getLocalCandidates(),
			capabilities	: capabilities
		});
	}
	
	/**
	 * Create new peer connection server to manage remote peer connection clients
	 * @param {TransactionManager} tm
	 * @param {Object} capabilities - Same as SDPInfo.answer capabilites
	 * @returns {PeerConnectionServer}
	 */
	createPeerConnectionServer(tm,capabilities)
	{
		//Create new one 
		return new PeerConnectionServer(this,tm,capabilities);
	}
	
	/**
	 * Mirror incoming stream from another endpoint. Used to avoid inter-thread synchronization when attaching multiple output streams.
	 * The endpoint will cache the cucrrent mirrored streams and return an already existing object if calling this method twice with same stream.
	 * @param {IncomingStream} incomingStream - stream to mirror
	 * @returns {IncomingStream} mirrored stream.
	 */
	mirrorIncomingStream(incomingStream)
	{
		//Get mirrored track
		let mirroredStream = this.mirrored.streams.get(incomingStream);
		
		//If not mirrored yet
		if (!mirroredStream)
		{
			//Create new stream
			mirroredStream = new IncomingStream(incomingStream.transport,incomingStream.receiver, new StreamInfo(incomingStream.getId()));
			
			//Add to map and mirror set
			this.mirrored.streams.set(incomingStream,mirroredStream);
			this.mirrored.mirrors.add(mirroredStream);
			
			//For each track 
			for (const incomingStreamTrack of incomingStream.getTracks())
			{
				//Create mirror track
				const mirroredStreamTrack = this.mirrorIncomingStreamTrack(incomingStreamTrack);
				//Add to mirrored stream
				mirroredStream.addTrack(mirroredStreamTrack);
			}
			
			//Listen for new tacks
			incomingStream.on("addedtrack",(incomingStreamTrack)=>{
				//Create mirror track
				const mirroredStreamTrack = this.mirrorIncomingStreamTrack(incomingStreamTrack);
				//Add to mirrored stream
				mirroredStream.addTrack(mirroredStreamTrack);
			});
			
			//Stop listener for original stream
			const onstopped = ()=>{
				//Stop mirror
				mirroredStream.stop();
			};
			
			//Listen for stop event
			incomingStream.once("stopped",onstopped);
			
			//Delete from maps when stoped
			mirroredStream.once("stopped",()=>{
				//Remove references
				this.mirrored.streams.delete(incomingStream);
				this.mirrored.mirrors.delete(mirroredStream);
				//Remove listener
				incomingStream.off("stopped",onstopped);
			});
		}
		//return mirror
		return mirroredStream;
	}
	
	/**
	 * Mirror incoming stream track from another endpoint. Used to avoid inter-thread synchronization when attaching multiple output tracks.
	 * The endpoint will cache the cucrrent mirrored tracks and return an already existing object if calling this method twice with same track.
	 * @param {IncomingStreamTrack} incomingStreamTrack - track to mirror
	 * @returns {IncomingStreamTrackMirrored} mirrored track.
	 */
	mirrorIncomingStreamTrack(incomingStreamTrack)
	{
		//Get mirrored track
		let mirroredStreamTrack = this.mirrored.tracks.get(incomingStreamTrack);
		
		//If not mirrored yet
		if (!mirroredStreamTrack)
		{
			//Create mirror track
			mirroredStreamTrack  = new IncomingStreamTrackMirrored(incomingStreamTrack,this.bundle.GetTimeService());
			//Add to track map and mirrors set
			this.mirrored.tracks.set(incomingStreamTrack,mirroredStreamTrack);
			this.mirrored.mirrors.add(mirroredStreamTrack);
			
			//Stop listener for original track
			const onstopped = ()=>{
				//Stop mirror
				mirroredStreamTrack.stop();
			};
			//Listen for stop event
			incomingStreamTrack.once("stopped",onstopped);
			
			//Stop listener
			mirroredStreamTrack.once("stopped",()=>{
				//Remove references
				this.mirrored.tracks.delete(incomingStreamTrack);
				this.mirrored.mirrors.delete(mirroredStreamTrack);
				//Remove listener
				incomingStreamTrack.off("stopped",onstopped);
			});
		}
		//return mirror
		return mirroredStreamTrack;
	}
	
	
	/**
	 * Create new SDP manager, this object will manage the SDP O/A for you and produce a suitable trasnport.
	 * @param {String} sdpSemantics - Type of sdp plan "unified-plan" or "plan-b" 
	 * @param {Object} capabilities - Capabilities objects
	 * @returns {SDPManager}
	 */
	createSDPManager(sdpSemantics,capabilities)
	{
		if (sdpSemantics=="plan-b")
			return new SDPManagerPlanB(this,capabilities);
		else if (sdpSemantics=="unified-plan")
			return new SDPManagerUnified(this,capabilities);
		//Unknown
		return null;
	}
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listeener	- Event listener
	 * @returns {Endpoint} 
	 */
	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter.on.apply(this.emitter, arguments);  
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Add event listener once
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {Endpoint} 
	 */
	once() 
	{
		//Delegate event listeners to event emitter
		this.emitter.once.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Remove event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {Endpoint} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Stop the endpoint UDP server and terminate any associated transport
	 */
	stop()
	{
		//Don't call it twice
		if (!this.bundle) return;
		
		//For each transport
		for (let transport of this.transports)
			//Stop it
			transport.stop();
		
		//For each mirrored stream or track
		for (let mirror of this.mirrored.mirrors)
			//Stop it
			mirror.stop();
		
		/**
		* Endpoint stopped event
		*
		* @name stopped
		* @memberof Endpoint
		* @kind event
		* @argument {Endpoint} endpoint
		*/
		this.emitter.emit("stopped",this);
		
		//End bundle
		this.bundle.End();
		
		//Remove bundle reference, so destructor is called on GC
		this.bundle = null;
	}
}

module.exports = Endpoint;
