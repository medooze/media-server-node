const NetworkUtils			= require("./NetworkUtils");
const Native				= require("./Native");
const Emitter			= require("medooze-event-emitter");
const Transport				= require("./Transport");
const PeerConnectionServer		= require("./PeerConnectionServer");
const SDPManager			= require("./SDPManager");
const SDPManagerUnified			= require("./SDPManagerUnified");
const SDPManagerPlanB			= require("./SDPManagerPlanB");
const IncomingStream			= require("./IncomingStream");
const IncomingStreamTrackMirrored	= require("./IncomingStreamTrackMirrored");
const IncomingStreamTrack		= require("./IncomingStreamTrack");
const OutgoingStream			= require("./OutgoingStream");
const OutgoingStreamTrack		= require("./OutgoingStreamTrack");
const ActiveSpeakerMultiplexer		= require("./ActiveSpeakerMultiplexer");
	
const SemanticSDP	= require("semantic-sdp");
const {
	SDPInfo,
	MediaInfo,
	CandidateInfo,
	DTLSInfo,
	ICEInfo,
	StreamInfo,
	TrackInfo,
	Setup,
} = require("semantic-sdp");

const assertUnreachable = (/** @type {never} */ x) => { throw new Error('assertion failed') };

//@ts-expect-error
const parseInt = /** @type {(x: number) => number} */ (global.parseInt);

/**
 * @typedef {Object} CreateTransportOptions Dictionary with transport properties
 * @property {boolean} [disableSTUNKeepAlive] Disable ICE/STUN keep alives, required for server to server transports
 * @property {String} [srtpProtectionProfiles] Colon delimited list of SRTP protection profile names
 * @property {boolean} [overrideBWE] Override BWE reported by REMB
 * @property {boolean} [disableREMB] Disable REMB BWE calculation.
 * @property {boolean} [prefferDTLSSetupActive] Preffer setting local DTLS setup to 'active' if remote is 'actpass'.
 */

/**
 * @typedef {Object} PeerInfo
 * @property {SemanticSDP.ICEInfoLike} ice ICE info, containing the username and password
 * @property {SemanticSDP.DTLSInfoLike} dtls DTLS info
 * @property {SemanticSDP.CandidateInfoLike[]} [candidates] ICE candidates list (for local info, it's not really used at all)
 */

/**
 * @typedef {Object} ParsedPeerInfo
 * @property {SemanticSDP.ICEInfo} ice
 * @property {SemanticSDP.DTLSInfo} dtls
 * @property {SemanticSDP.CandidateInfo[]} candidates
 */

/**
 * @typedef {Object} CreateOfferParameters
 * @property {boolean} [unified] - Generate unified plan like media ids
 */


/** @returns {ParsedPeerInfo} */
function parsePeerInfo(/** @type {PeerInfo | SemanticSDP.SDPInfo} */ info)
{
	/** @type {PeerInfo} */
	let peerInfo;

	//Support both plain js object and SDPInfo
	if (info.constructor.name === "SDPInfo") {
		const sdpInfo = /** @type {SemanticSDP.SDPInfo} */ (info);
		//Convert
		peerInfo = {
			dtls		: sdpInfo.getDTLS(),
			ice		: sdpInfo.getICE(),
			candidates	: sdpInfo.getCandidates()
		};
	} else {
		peerInfo = /** @type {PeerInfo} */ (info);
	}

	//Ensure that we have the correct params
	if (!info || !info.ice || !info.dtls)
		//Error
		throw new Error("No ICE or DTLS info provided");
	
	//Create remote properites
	return {
		dtls		: DTLSInfo.clone(peerInfo.dtls),
		ice		: ICEInfo.clone(peerInfo.ice),
		candidates	: (peerInfo.candidates || []).map(CandidateInfo.clone),
	};
}

/**
 * @typedef {Object} RawTxOptions
 * @property {string} interfaceName    (required) name of interface to send on
 * @property {boolean} [skipQdisc]    whether to skip the traffic shaping (qdisc) on the interface
 * @property {number} [sndBuf]    AF_PACKET socket send queue
 */

/** @typedef {Native.RTPBundleTransport & { rawTxInterface?: number }} NativeBundle */

/**
 * @typedef {Object} EndpointEvents
 * @property {(self: Endpoint) => void} stopped
 */

/**
 * An endpoint represent an UDP server socket.
 * The endpoint will process STUN requests in order to be able to associate the remote ip:port with the registered transport and forward any further data comming from that transport.
 * Being a server it is ICE-lite.
 * @extends {Emitter<EndpointEvents>}
 */
class Endpoint extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(
		/** @type {string | string[]} */ ip,
		packetPoolSize = 0)
	{
		//Init emitter
		super();

		//Store ip address of the endpoint
		this.ips = Array.isArray(ip) ? ip : [ip];
		//Create native endpoint
		/** @type {NativeBundle} */
		this.bundle = new Native.RTPBundleTransport(packetPoolSize);
		//Start it
		if (!this.bundle.Init())
			//Throw errror
			throw new Error("Could not initialize bundle for endpoint");
		//Store all transports
		this.transports = /** @type {Set<Transport>} */ (new Set());
		//Create candidates 
		this.candidates = /** @type {CandidateInfo[]} */ ([]);
		//Default
		this.defaultSRTPProtectionProfiles = "";
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

		//Mirrored streams and tracks
		this.mirrored = {
			streams : /** @type {WeakMap<IncomingStream, IncomingStream>} */ (new WeakMap()),
			tracks	: /** @type {WeakMap<IncomingStreamTrack, IncomingStreamTrackMirrored>} */ (new WeakMap()),
			mirrors : /** @type {Set<IncomingStream | IncomingStreamTrackMirrored>} */ (new Set()),
		};
	}
	
	/**
	 * Set cpu affinity for udp send/recv thread.
	 * @param {Number}  cpu - CPU core or -1 to reset affinity.
	 * @returns {boolean} true if operation was successful
	 */
	setAffinity(cpu)
	{
		//Set cpu affinity
		return this.bundle.SetAffinity(parseInt(cpu));
	}

	/** 
	 * setDefaultSRTProtectionProfiles
	 * @param {String} srtpProtectionProfiles - Colon delimited list of SRTP protection profile names
	 */
	 setDefaultSRTProtectionProfiles(srtpProtectionProfiles)
	 {
		this.defaultSRTPProtectionProfiles = srtpProtectionProfiles;
	 }

	/**
	 * [EXPERIMENTAL] See TypeScript typings for usage.
	 *
	 * @param {false | RawTxOptions} options Options for raw TX. Pass false to disable.
	 */
	async setRawTx(options)
	{
		// if false was passed, disable raw TX sending
		if (options === false) {
			this.bundle.ClearRawTx();
			delete this.bundle.rawTxInterface;
			return;
		}
		// gather necessary information and pass it to the bundle
		const config = await NetworkUtils.getInterfaceRawConfig(options.interfaceName);
		const port = this.getLocalPort();
		this.bundle.SetRawTx(
			config.index, options.sndBuf || 0, !!options.skipQdisc,
			config.lladdr, ...config.defaultRoute, port,
		);
		this.bundle.rawTxInterface = config.index;
	}

	/**
	 * Set name for udp send/recv thread.
	 *
	 * Useful for debugging or tracing. Currently only supported
	 * on Linux, fails on other platforms.
	 * Length is limited to 16 bytes.
	 * @param {String}  name - thread name to set
	 * @returns {boolean} true if operation was successful
	 */
	setThreadName(name)
	{
		return this.bundle.SetThreadName(name);
	}

	/**
	 * Set thread priority for udp send/recv thread.
	 * NOTE: User needs to have the appropiate rights to increase the thread priority in ulimit
	 * @param {Number}  priority - 0:Normal -19:RealTime
	 * @returns {boolean} true if operation was successful
	 */
	setPriority(priority)
	{
		//Set cpu affinity
		return this.bundle.SetPriority(parseInt(priority));
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
	 * Get port at which UDP socket is bound
	 */
	getLocalPort()
	{
		return this.bundle.GetLocalPort()
	}
	
	/**
	 * Create a new transport object and register it with the remote ICE username and password
	 * @param {SemanticSDP.SDPInfo | PeerInfo} remoteInfo Remote ICE and DTLS properties
	 * @param {SemanticSDP.SDPInfo | PeerInfo} [localInfo] Local ICE and DTLS properties
	 * @param {CreateTransportOptions} [options]
	 * @returns {Transport}	New transport object
	 */
	createTransport(remoteInfo, localInfo, options, logId, logger)
	{
		//Check we have a transport already
		if (!this.bundle)
			//Error
			throw new Error("Endpoint is already stopped, cannot create transport");
		
		const remote = parsePeerInfo(remoteInfo);
		
		//If there is no local info, generate one
		const local = parsePeerInfo(localInfo || {
			ice		: ICEInfo.generate(true),
			dtls		: new DTLSInfo(Setup.reverse(remote.dtls.getSetup(),  options?.prefferDTLSSetupActive), "sha-256", this.fingerprint),
			candidates	: this.candidates
		});
		
		//Set lite nd end of candidates to ICE info
		local.ice.setLite(true);
		local.ice.setEndOfCandidates(true);

		//Create native tranport and return wrapper
		const transport = new Transport(this.bundle, remote, local, Object.assign({
				 disableSTUNKeepAlive	: false,
				 srtpProtectionProfiles : this.defaultSRTPProtectionProfiles
			}, options), logId, logger
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
	 * @returns {Array<CandidateInfo>}
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
	 * @param {SemanticSDP.Capabilities} [capabilities] - Media capabilities as required by SDPInfo.create
	 * @param {CreateOfferParameters} [params]
	 * @returns {SDPInfo} - SDP offer
	 */
	createOffer(capabilities, params)
	{
		//Create offer
		return SDPInfo.create({
			dtls		: new DTLSInfo(Setup.ACTPASS,"sha-256",this.fingerprint),
			ice		: ICEInfo.generate(true),
			candidates	: this.getLocalCandidates(),
			capabilities	: capabilities,
			unified		: !!params?.unified
		});
	}
	
	/**
	 * Create new peer connection server to manage remote peer connection clients
	 * @param {any} tm
	 * @param {SemanticSDP.Capabilities} capabilities - Same as SDPInfo.answer capabilities
	 * @param {CreateTransportOptions} options
	 * @returns {PeerConnectionServer}
	 */
	createPeerConnectionServer(tm,capabilities,options, logId, logger)
	{
		//Create new one 
		return new PeerConnectionServer(this,tm,capabilities,options, logId, logger);
	}
	
	/**
	 * Create new active speaker multiplexer for given outgoing tracks
	 * @param {OutgoingStream|OutgoingStreamTrack[]} streamOrTracks - Outgoing stream or outgoing stream track array to be multiplexed
	 * @returns {ActiveSpeakerMultiplexer}
	 */
	createActiveSpeakerMultiplexer(streamOrTracks)
	{
		return new ActiveSpeakerMultiplexer(this.bundle.GetTimeService(),streamOrTracks);
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
		let mirroredStream = /** @type {IncomingStream} */ (this.mirrored.streams.get(incomingStream));
		
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
				mirroredStream.addTrack(/** @type {any} */ (mirroredStreamTrack));
			}
			
			//Listen for new tacks
			incomingStream.on("track",(incomingStream,incomingStreamTrack)=>{
				//Create mirror track
				const mirroredStreamTrack = this.mirrorIncomingStreamTrack(incomingStreamTrack);
				//Add to mirrored stream
				mirroredStream.addTrack(/** @type {any} */ (mirroredStreamTrack));
			});
			
			// Listen for track removal
			incomingStream.on("trackremoved", (incomingStream, incomingStreamTrack) => {
				mirroredStream.removeTrack(incomingStreamTrack.getId());
			});
			
			// Listen for track removal
			mirroredStream.on("trackremoved", (incomingStream, incomingStreamTrack) => {
				this.mirrored.tracks.delete(incomingStreamTrack);
				this.mirrored.mirrors.delete(/** @type {any} */ (incomingStreamTrack));
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
		let mirroredStreamTrack = /** @type {IncomingStreamTrackMirrored} */ (this.mirrored.tracks.get(incomingStreamTrack));
		
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
	 * @param {"unified-plan" | "plan-b"} sdpSemantics - Type of sdp plan
	 * @param {SemanticSDP.Capabilities} capabilities - Capabilities objects
	 * @returns {SDPManager}
	 */
	createSDPManager(sdpSemantics,capabilities, logId, logger)
	{
		if (sdpSemantics=="plan-b")
			return new SDPManagerPlanB(this,capabilities, logId, logger);
		else if (sdpSemantics=="unified-plan")
			return new SDPManagerUnified(this,capabilities, logId, logger);
		//Unknown
		return assertUnreachable(sdpSemantics);
	}
	
	/**
	 * Stop the endpoint UDP server and terminate any associated transport
	 */
	stop()
	{
		//Don't call it twice
		if (this.stopped) return;

		//Mark as stopped
		this.stopped = true;
		
		//For each transport
		for (let transport of this.transports)
			//Stop it
			transport.stop();
		
		//For each mirrored stream or track
		for (let mirror of this.mirrored.mirrors)
			//Stop it
			mirror.stop();
		
		this.emit("stopped",this);
		
		//End bundle
		this.bundle.End();
		
		//Stop emitter
		super.stop();
		
		//Remove bundle reference, so destructor is called on GC
		//@ts-expect-error
		this.bundle = null;
	}
}

module.exports = Endpoint;
