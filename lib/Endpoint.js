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
 * An endpoint represent an UDP server socket.
 * The endpoint will process STUN requests in order to be able to associate the remote ip:port with the registered transport and forward any further data comming from that transport.
 * Being a server it is ICE-lite.
 */
class Endpoint extends Emitter
{
	/**
	 * @ignore
	 * @hideconstructor
	 * private constructor
	 */
	constructor(ip, packetPoolSize = 0)
	{
		//Init emitter
		super();

		//Store ip address of the endpoint
		this.ips = Array.isArray(ip) ? ip : [ip];
		//Create native endpoint
		this.bundle = new Native.RTPBundleTransport(packetPoolSize);
		//Start it
		if (!this.bundle.Init())
			//Throw errror
			throw new Error("Could not initialize bundle for endpoint");
		//Store all transports
		this.transports = new Set();
		//Create candidates 
		this.candidates = [];
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
			streams : new WeakMap(),
			tracks	: new WeakMap(),
			mirrors : new Set()
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
	 * @param {String} profiles - Colon delimited list of SRTP protection profile names
	 */
	 setDefaultSRTProtectionProfiles(srtpProtectionProfiles)
	 {
		this.defaultSRTPProtectionProfiles = srtpProtectionProfiles;
	 }

	/**
	 * [EXPERIMENTAL] See TypeScript typings for usage.
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
	 * @param {Object|SDPInfo}  remoteInfo	- Remote ICE and DTLS properties
	 * @param {Object|ICEInfo}  remoteInfo.ice	- Remote ICE info, containing the username and password.
	 * @param {Object|DTLSInfo} remoteInfo.dtls	- Remote DTLS info
	 * @param {Array.CandidateInfo|Array.Object} remoteInfo.candidates - Remote ICE candidate info
	 * @param {Object}   localInfo		- Local ICE and DTLS properties (optional)
	 * @param {ICEInfo}  localInfo.ice		- Local ICE info, containing the username and password. Local ICE candidates list is not really used at all.
	 * @param {DTLSInfo} localInfo.dtls		- Local DTLS info
	 * @param {Array.CandidateInfo} localInfo.candidates - Local candidate info
	 * @param {Object} options		- Dictionary with transport properties
	 * @param {boolean} options.disableSTUNKeepAlive - Disable ICE/STUN keep alives, required for server to server transports
	 * @param {String} options.srtpProtectionProfiles - Colon delimited list of SRTP protection profile names
	 * @param {boolean} options.overrideBWE - Override BWE reported by REMB
	 * @param {boolean} options.disableREMB - Disable REMB BWE calculation.
	 * @param {boolean} options.prefferDTLSSetupActive - Preffer setting local DTLS setup to 'active' if remote is 'actpass'.
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
				dtls		: new DTLSInfo(Setup.reverse(remoteInfo.dtls.getSetup(),  options?.prefferDTLSSetupActive), "sha-256", this.fingerprint),
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
		const transport = new Transport(this.bundle, remote, local, Object.assign({
				 disableSTUNKeepAlive	: false,
				 srtpProtectionProfiles : this.defaultSRTPProtectionProfiles
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
			incomingStream.on("track",(incomingStream,incomingStreamTrack)=>{
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
	 * @param {"unified-plan" | "plan-b"} sdpSemantics - Type of sdp plan
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
