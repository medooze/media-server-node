import SemanticSDP = require('semantic-sdp');

declare namespace _default {
  /**
   * "min","max" and "avg" packet waiting times in rtp buffer before delivering
   * them
   */
  export interface WaitTimeStats {
    min: number;
    max: number;
    avg: number;
  }

  export type MediaCapabilities = {
    audio?: SemanticSDP.SupportedMedia;
    video?: SemanticSDP.SupportedMedia;
  };

  export interface CreateStreamerSessionOptions {
    /** Local parameters */
    local?: {
      /** receiving port */
      port: number;
    };
    /** Remote parameters */
    remote?: {
      /** sending ip address */
      ip: string;
      /** sending port */
      port: number;
    };
  }

  /** DTLS connection state as per the w3c spec */
  export type DTLSState = "new" | "connecting" | "connected" | "closed" | "failed";

  export interface CreateOutgoingStreamOptions {
    id?: string;
    audio?: boolean|CreateStreamTrackOptions|CreateStreamTrackOptions[];
    video?: boolean|CreateStreamTrackOptions|CreateStreamTrackOptions[];
  }

  export interface PlayerPlayOptions {
    /** Repeat playback when file is ended */
    repeat: boolean;
  }

  export interface EmulatedTransportPlayOptions {
    /** Set start time */
    start: number;
  }

  export interface Encoding {
    id: string;
    source: any;
    depacketizer: any;
  }

  export interface LayerSelection {
    /** rid value of the simulcast encoding of the track (default: first encoding available) */
    encodingId: string;
    /** The spatial layer id to send to the outgoing stream (default: max layer available) */
    spatialLayerId: number;
    /** The temporal layer id to send to the outgoing stream (default: max layer available) */
    temporalLayerId: number;
    /** Max spatial layer id (default: unlimited) */
    maxSpatialLayerId: number;
    /** Max temporal layer id (default: unlimited) */
    maxTemporalLayerId: number;
  }

  export interface LayerStats {
    /** Spatial layer id */
    spatialLayerId: number;
    /** Temporal layer id */
    temporalLayerId: number;
    /** total rtp received bytes for this layer */
    totalBytes: number;
    /** number of rtp packets received for this layer */
    numPackets: number;
    /** average bitrate received during last second for this layer */
    bitrate: number;
  }

  export interface IncomingSourceStats {
    /** total recevied frames */
    numFrames: number;
    /** recevied frames during last second */
    numFramesDelta: number;
    /** total lost packkets */
    lostPackets: number;
    /** Lost/out of order packets during last second */
    lostPacketsDelta: number;
    /** max total consecutieve packets lossed during last second */
    lostPacketsMaxGap: number;
    /** number of packet looses bursts during last second */
    lostPacketsGapCount: number;
    /** droppted packets by media server */
    dropPackets: number;
    /** number of rtp packets received */
    numPackets: number;
    /** number of rtp packets received during last seconds */
    numPacketsDelta: number;
    /** number of rtcp packsets received */
    numRTCPPackets: number;
    /** total rtp received bytes */
    totalBytes: number;
    /** total rtp received bytes */
    totalRTCPBytes: number;
    /** total PLIs sent */
    totalPLIs: number;
    /** total NACk packets sent */
    totalNACKs: number;
    /** average bitrate received during last second in bps */
    bitrate: number;
    /** difference between NTP timestamp and RTP timestamps at sender (from RTCP SR) */
    skew: number;
    /** ratio between RTP timestamps and the NTP timestamp and  at sender (from RTCP SR) */
    drift: number;
    /** RTP clockrate */
    clockRate: number;
    /** Average frame delay during the last second */
    frameDelay: number;
    /** Max frame delay during the last second */
    frameDelayMax: number;
    /** Average bewtween local reception time and sender capture one (Absolute capture time must be negotiated) */
    frameCaptureDelay: number;
    /** Max bewtween local reception time and sender capture one (Absolute capture time must be negotiated) */
    frameCaptureDelayMax: number;
    /** Information about each spatial/temporal layer (if present) */
    layers: LayerStats[];
  }

  export interface OutgoingSourceStats {
    /** Round Trip Time in ms */
    rtt: number;
    /** total recevied frames */
    numFrames: number;
    /** recevied frames during last second */
    numFramesDelta: number;
    /** number of rtp packets sent */
    numPackets: number;
    /** number of rtp packets sent during last second */
    numPacketsDelta: number;
    /** number of rtcp packets sent */
    numRTCPPackets: number;
    /** total rtp sent bytes */
    totalBytes: number;
    /** total rtp sent bytes */
    totalRTCPBytes: number;
    /** average bitrate sent during last second in bps */
    bitrate: number;
    /** number of RTCP receiver reports received */
    reportCount: number;
    /** number of RTCP receiver reports received during last second */
    reportCountDelta: number;
    /** last report, if available */
    reported: {
      /** total packet loses reported */
      lostCount: number;
      /** packet losses reported in last second */
      lostCountDelta: number;
      /** fraction loss media reported during last second */
      fractionLost: number;
      /** last reported jitter buffer value */
      jitter: number;
    } | undefined;
  }

  export interface OutgoingStreamTrackStats {
    /** Stats for the media stream */
    media: OutgoingSourceStats;
    /** Stats for the rtx retransmission stream */
    rtx: OutgoingSourceStats;
    /** remote estimated bitate (if remb is in use) */
    remb: number;
    /** timestamp (ms since epoch) on when this stats where created */
    timestamp: number;
    /** number of rtp packets sent */
    numPackets: number;
    /** number of rtp packets sent during last second  */
    numPacketsDelta: number;
    /** Round Trip Time in ms */
    rtt: number;
    /** Bitrate for media stream only in bps */
    bitrate: number;
    /** Accumulated bitrate for media and rtx streams in bps */
    total: number;
  }

  export interface OutgoingStreamStats {
    [trackID: string]: OutgoingStreamTrackStats;
  }

  export interface IncomingStreamTrackEncodingStats {
    /** Stats for the media stream */
    media: IncomingSourceStats;
    /** Stats for the rtx retransmission stream */
    rtx: IncomingSourceStats;
    /** Stats for the fec stream */
    fec: IncomingSourceStats;
    /** Round Trip Time in ms */
    rtt: number;
    /** "min","max" and "avg" packet waiting times in rtp buffer before delivering them */
    waitTime: WaitTimeStats;
    /** Bitrate for media stream only in bps */
    bitrate: number;
    /** Accumulated bitrate for rtx, media and fec streams in bps */
    total: number;
    /** Estimated available bitrate for receiving (only available if not using transport wide cc) */
    remb: number;
    /** When this stats was generated, in order to save workload, stats are cached for 200ms */
    timestamp: number;
    /** Simulcast layer index based on bitrate received (-1 if it is inactive). */
    simulcastIdx: number;
    /** Accumulated lost packets for media and rtx streams */
    lostPackets: number;
    /** Accumulated packets for media and rtx streams */
    numPackets: number;
    /** Lost packets ratio */
    lostPacketsRatio: number;
  }

  export interface IncomingStreamTrackStats {
    [encodingID: string]: IncomingStreamTrackEncodingStats;
  }
  export interface IncomingStreamStats {
    [trackID: string]: IncomingStreamTrackStats;
  }

  export interface CreateRecorderOptions {
    /** Periodically refresh an intra on all video tracks (in ms) */
    refresh?: number;
    /** Wait until first video iframe is received to start recording media */
    waitForIntra?: boolean;
  }

  export interface SetTargetBitrateOptions {
    /**
     * Traversal algorithm [Default: "default"]
     */
    traversal?: "default" | "spatial-temporal" | "zig-zag-spatial-temporal" | "temporal-spatial" | "zig-zag-temporal-spatial";
    /**
     * If there is not a layer with a bitrate lower than target, stop sending
     * media [Default: false]
     */
    strict?: boolean;
  }

  export interface SetTargetBitrateResult {
    encodingId: string;
    spatialLayerId: number;
    temporalLayerId: number;
    /** available layers considered for selection */
    layers: Layer[];
    /** layer that was selected */
    layerIndex: number;
    /** equivalent to `layers[layerIndex]` */
    layer: Layer;
  }

  export interface SetTransportPropertiesOptions {
    /** Audio media info */
    audio?: SemanticSDP.MediaInfo;
    /** Video media info */
    video?: SemanticSDP.MediaInfo;
  }

  export interface CreateTransportOptions {
    /**
     * Disable ICE/STUN keep alives, required for server to server transports
     */
    disableSTUNKeepAlive: boolean;
    /** Colon delimited list of SRTP protection profile names */
    srtpProtectionProfiles: string;
    /** Override BWE reported by REMB */
    overrideBWE: boolean;
    /** Disable REMB BWE calculation */
    disableREMB: boolean;
  }

  export interface TransportDumpOptions {
    /** Dump incoming RTP data */
    incoming: boolean;
    /** Dump outgoing RTP data */
    outbound: boolean;
    /** Dump rtcp RTP data */
    rtcp: boolean;
  }

  export interface SSRCs {
    /** ssrc for the media track  */
    media?: number;
    /** ssrc for the rtx track (only applicable to video tracks) */
    rtx?: number;
  }

  export interface CreateStreamTrackOptions {
    /** Stream track id (default: "audio" for audio tracks, "video" for video tracks) */
    id?: string;
    /** Stream track media id (mid) */
    mediaId?: string;
    /** Override the generated ssrcs for this track */
    ssrcs?: SSRCs;
  }

  export interface Layer {
    encodingId?: number;
    simulcastIdx?: number;
    spatialLayerId?: number;
    temporalLayerId?: number;
    bitrate?: number;
  }

  export interface Encoding {
    id: string;
    simulcastIdx: number;
    bitrate: number;
    layers: Layer[];
  }

  export interface ActiveLayers {
    active: Encoding[];
    inactive: Layer[];
    layers: Layer[];
  }

  interface OutgoingStreamEventMap {
    track(track: OutgoingStreamTrack): void;
    stopped(stream: OutgoingStream, stats: OutgoingStreamStats): void;
    muted(muted: boolean): void;
  }
  
  export interface OutgoingStream {
    // copy-pasted code for type-safe events
    emit<E extends keyof OutgoingStreamEventMap>(event: E, ...args: Parameters<OutgoingStreamEventMap[E]>): this;
    on<E extends keyof OutgoingStreamEventMap>(event: E, listener: OutgoingStreamEventMap[E]): this;
    once<E extends keyof OutgoingStreamEventMap>(event: E, listener: OutgoingStreamEventMap[E]): this;
    off<E extends keyof OutgoingStreamEventMap>(event: E, listener: OutgoingStreamEventMap[E]): this;
    addListener<E extends keyof OutgoingStreamEventMap>(event: E, listener: OutgoingStreamEventMap[E]): this;
    removeListener<E extends keyof OutgoingStreamEventMap>(event: E, listener: OutgoingStreamEventMap[E]): this;

    /**
     * Get statistics for all tracks in the stream
     */
    getStats(): OutgoingStreamStats;

    /**
     * Check if the stream is muted or not
     */
    isMuted(): boolean;

    /**
     * Mute/Unmute this stream and all the tracks in it
     * @param muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Listen media from the incoming stream and send it to the remote peer of the associated transport.
     * @param incomingStream - The incoming stream to listen media for
     * @param layers - [Optional] Only applicable to video tracks
     * @returns Track transponders array
     */
    attachTo(incomingStream: IncomingStream, layers?: LayerSelection): Transponder[];

    /**
     * Stop listening for media
     */
    detach(): void;

    /**
     * Get the stream info object for signaling the ssrcs and stream info on the
     * SDP to the remote peer
     * @returns {StreamInfo} The stream info object
     */
    getStreamInfo(): SemanticSDP.StreamInfo;

    /**
     * The media stream id as announced on the SDP
     * @returns {String}
     */
    getId(): string;

    /**
     * Get all the tracks
     * @param type - The media type (Optional)
     */
    getTracks(type?: SemanticSDP.MediaType): OutgoingStreamTrack[];

    /**
     * Get track by id
     * @param trackId - The track id
     * @returns requested track, or undefined if not found
     */
    getTrack(trackId: string): IncomingStreamTrack | undefined;

    /**
     * Get an array of the media stream audio tracks
     */
    getAudioTracks(): OutgoingStreamTrack[];

    /**
     * Get an array of the media stream video tracks
     */
    getVideoTracks(): OutgoingStreamTrack[];

    /**
     * Adds an incoming stream track created using the
     * [[Transponder.createOutgoingStreamTrack]] to this stream
     */
    addTrack(track: OutgoingStreamTrack): void;

    /**
     * Create new track from a TrackInfo object and add it to this stream
     * @param params - Params plain object, StreamInfo object or media type
     * @returns The new outgoing stream
     */
    createTrack(params: SemanticSDP.TrackInfo |SemanticSDP.TrackInfoPlain |
                (CreateStreamTrackOptions & { media: SemanticSDP.MediaType }) |
                SemanticSDP.MediaType): OutgoingStreamTrack;

    stop(): void;
  }

  export interface TransportStats {
    /** Sender side estimation bitrate (if available) */
    senderSideEstimationBitrate?: number;
    /** ICE related stats */
    ice: {
      /** Number of ice requests sent */
      requestsSent: number;
      /** Number of ice requests received */
      requestsReceived: number;
      /** Number of ice responses sent */
      responsesSent: number;
      /** Number of ice responses received */
      responsesReceived: number;
    };
  }

  interface TransportEventMap {
    outgoingtrack(track: OutgoingStreamTrack, stream: OutgoingStream|null): void;
    incomingtrack(track: IncomingStreamTrack, stream: IncomingStream|null): void;
    stopped(transport: Transport): void;

    /**
     * Transport sender side estimation bitrate target update
     */
    targetbitrate(bitrate: number): void;

    /**
     * DTLS state change event
     */
    dtlsstate(newState: DTLSState): void;

    /**
     * ICE remote candidate activation event.
     * This event fires when ICE candidate has correctly being checked out and we start using it for sending.
     * @param {CandidateInfo} candidate - Candidate that is in use by transport
     */
    remoteicecandidate(candidate: SemanticSDP.CandidateInfo): void;

    /**
     * ICE timoute event. Fired when no ICE request ar received for 30 seconds.
     */
    icetimeout(): void;

    /**
     * [EXPERIMENTAL] This option is currently Linux-specific and undocumented. Use at your own risk.
     *
     * Error occurred when calling [[setCandidateRawTxData]] automatically. See [[Endpoint.setRawTx]].
     */
    rawtxdataerror(ip: string, port: number, error: any): void;
  }

  export interface Transport {
    // copy-pasted code for type-safe events
    emit<E extends keyof TransportEventMap>(event: E, ...args: Parameters<TransportEventMap[E]>): this;
    on<E extends keyof TransportEventMap>(event: E, listener: TransportEventMap[E]): this;
    once<E extends keyof TransportEventMap>(event: E, listener: TransportEventMap[E]): this;
    off<E extends keyof TransportEventMap>(event: E, listener: TransportEventMap[E]): this;
    addListener<E extends keyof TransportEventMap>(event: E, listener: TransportEventMap[E]): this;
    removeListener<E extends keyof TransportEventMap>(event: E, listener: TransportEventMap[E]): this;

    /**
     * Dump incoming and outgoint rtp and rtcp packets into a pcap file
     * @param {String} filename - Filename of the pcap file
     * @param {Object} options  - Dump parameters (optional)
     * @param {Boolean} options.incomoning   - Dump incomoning RTP data
     * @param {Boolean} options.outbound  - Dump outgoing RTP data
     * @param {Boolean} options.rtcp      - Dump rtcp RTP data
     */
    dump(filename: string, options?: TransportDumpOptions): void;

    /**
     * Stop dumping transport rtp and rtcp packets
     */
    stopDump(): void;

    /**
     * Get transport stats
     */
    getStats(): TransportStats;

    /**
     * Restart ICE on transport object
     * @param remoteICE - Remote ICE info, containing the username and password.
     * @param localICE - Local ICE info, containing the username and password [Optional]
     * @returns Local ICE info
     */
    restartICE(remoteICE: SemanticSDP.ICEInfo, localICE?: SemanticSDP.ICEInfo): SemanticSDP.ICEInfo;

    /**
     * Get available outgoing bitrate in bps
     */
    getAvailableOutgoingBitrate(): number;

    /**
     * Enable bitrate probing.
     * This will send padding only RTX packets to allow bandwidth estimation
     * algortithm to probe bitrate beyonf current sent values. The ammoung of
     * probing bitrate would be limited by the sender bitrate estimation and the
     * limit set on the setMaxProbing Bitrate. Note that this will only work on
     * browsers that supports RTX and transport wide cc.
     */
    setBandwidthProbing(probe: boolean): void;

    /**
     * Set the maximum bitrate to be used if probing is enabled.
     */
    setMaxProbingBitrate(bitrate: number): void;

    /**
     * Enable or disable calculation of sender side estimation if transport wide cc has been negotiated
     */
    enableSenderSideEstimation(enabled: boolean): void;

    /**
      * Override the bitrate sent by REMB to the remote sender. The transport must be constructed with teh override bwe option, and transport wide cc must not be offered.
      */
    setRemoteOverrideBitrate(bitrate: number): void;

    /**
      * Do not allow probing to increase sent bitrate above certain limit
      */
    setProbingBitrateLimit(bitrate: number): void;

    /**
     * Set local RTP properties
     * @param {Object|SDPInfo} rtp - Object param containing media information
     *     for audio and video
     * @param {MediaInfo} rtp.audio	- Audio media info
     * @param {MediaInfo} rtp.video	- Video media info
     */
    setLocalProperties(rtp: SemanticSDP.SDPInfo|
                       SetTransportPropertiesOptions): void;

    /**
     * Set remote RTP properties
     * @param {Object|SDPInfo} rtp - Object param containing media information
     *     for audio and video
     * @param {MediaInfo} rtp.audio	- Audio media info
     * @param {MediaInfo} rtp.video	- Video media info
     */
    setRemoteProperties(rtp: SemanticSDP.SDPInfo|
                        SetTransportPropertiesOptions): void;

    /**
     * Get transport local DTLS info
     */
    getLocalDTLSInfo(): SemanticSDP.DTLSInfo;

    /**
     * Get transport local ICE info
     */
    getLocalICEInfo(): SemanticSDP.ICEInfo;

    /**
     * Get transport remote DTLS info
     */
    getRemoteDTLSInfo(): SemanticSDP.DTLSInfo;

    /**
     * Get transport remote ICE info
     */
    getRemoteICEInfo(): SemanticSDP.ICEInfo;

    /**
     * Get local ICE candidates for this transport
     * @returns {Array.CandidateInfo}
     */
    getLocalCandidates(): SemanticSDP.CandidateInfo[];

    /**
     * Get remote ICE candidates for this transport
     * @returns {Array.CandidateInfo}
     */
    getRemoteCandidates(): SemanticSDP.CandidateInfo[];

    /**
     * Register a remote candidate info. Only needed for ice-lite to ice-lite
     * endpoints
     * @returns Whether the remote ice candidate was already present or not
     */
    addRemoteCandidate(candidate: SemanticSDP.CandidateInfo): boolean;

    /**
     * Register an array remote candidate info. Only needed for ice-lite to
     * ice-lite endpoints
     */
    addRemoteCandidates(candidates: SemanticSDP.CandidateInfo[]): void;

    /**
     * [EXPERIMENTAL] This option is currently Linux-specific and undocumented. Use at your own risk.
     *
     * Refresh the raw TX data for a candidate. See [[Endpoint.setRawTx]].
     */
    setCandidateRawTxData(ip: string, port: number): Promise<void>

    /**
     * Create new outgoing stream in this transport
     * @param params - Params plain object, StreamInfo object or stream id (`mediaId` ignored)
     * @returns {OutgoingStream} The new outgoing stream
     */
    createOutgoingStream(params?: SemanticSDP.StreamInfo|
                         CreateOutgoingStreamOptions|string): OutgoingStream;

    /**
     * Create new outgoing stream in this transport
     * @param media - Track media type "audio" or "video"
     * @param params - Track parameters
     * @returns The new outgoing stream track
     */
    createOutgoingStreamTrack(
        media: SemanticSDP.MediaType,
        params?: CreateStreamTrackOptions): OutgoingStreamTrack;

    /**
     * Create an incoming stream object from the media stream info objet
     * @param {StreamInfo|Object} info Contains the ids and ssrcs of the stream
     *     to be created
     * @returns {IncomingStream} The newly created incoming stream object
     */
    createIncomingStream(info: SemanticSDP.StreamInfo|string): IncomingStream;

    /**
     * Get all the incoming streams in the transport
     */
    getIncomingStreams(): IncomingStream[];

    /**
     * Get incoming stream
     * @param streamId - the stream ID
     * @returns the requested stream, or undefined if not found
     */
    getIncomingStream(streamId: string): IncomingStream | undefined;

    /**
     * Get all the outgoing streams in the transport
     */
    getOutgoingStreams(): OutgoingStream[];

    /**
     * Get outgoing stream
     * @param streamId - the stream ID
     * @returns the requested stream, or undefined if not found
     */
    getOutgoingStream(streamId: string): OutgoingStream | undefined;

    /**
     * Create new incoming stream in this transport. TODO: Simulcast is still
     * not supported
     * @param media - Track media type "audio" or "video"
     * @param params - Track parameters
     * @returns The new incoming stream track
     */
    createIncomingStreamTrack(
        media: SemanticSDP.MediaType,
        params?: CreateStreamTrackOptions): IncomingStreamTrack;

    /**
     * Create new outgoing stream and attach to the incoming stream
     * @param incomingStream - the incoming stream to be published in this transport
     * @returns The new outgoing stream
     */
    publish(incomingStream: IncomingStream): OutgoingStream;

    /**
     * Stop transport and all the associated incoming and outgoing streams
     */
    stop(): void;
  }

  interface EndpointEventMap {
    stopped(endpoint: Endpoint): void;
  }

  export interface Endpoint {
    // copy-pasted code for type-safe events
    emit<E extends keyof EndpointEventMap>(event: E, ...args: Parameters<EndpointEventMap[E]>): this;
    on<E extends keyof EndpointEventMap>(event: E, listener: EndpointEventMap[E]): this;
    once<E extends keyof EndpointEventMap>(event: E, listener: EndpointEventMap[E]): this;
    off<E extends keyof EndpointEventMap>(event: E, listener: EndpointEventMap[E]): this;
    addListener<E extends keyof EndpointEventMap>(event: E, listener: EndpointEventMap[E]): this;
    removeListener<E extends keyof EndpointEventMap>(event: E, listener: EndpointEventMap[E]): this;

    /**
     * Set cpu affinity for udp send/recv thread.
     * @param {Number}  cpu - CPU core or -1 to reset affinity.
     * @returns {boolean} true if operation was successful
     */
    setAffinity(cpu: number): boolean;

    /**
     * Set name for udp send/recv thread.
     *
     * Useful for debugging or tracing. Currently only supported
     * on Linux, fails on other platforms.
     * Length is limited to 16 bytes.
     * @param {String}  name - thread name to set
     * @returns {boolean} true if operation was successful
     */
    setThreadName(name: string): boolean;

    /**
     * Set thread priority for udp send/recv thread.
     * NOTE: User needs to have the appropiate rights to increase the thread priority in ulimit
     * @param {Number}  priority - 0:Normal -19:RealTime
     * @returns {boolean} true if operation was successful
     */
    setPriority(priority: number): boolean;

    /**
     * Set ICE timeout for outgoing ICE binding requests
     * @param {Number}  timeout - Ammount of time in milliseconds between ICE binding requests 
     */
    setIceTimeout(timeout: number): void;

    /**
     * [EXPERIMENTAL] This option is currently Linux-specific and undocumented. Use at your own risk.
     * 
     * @param options Options for raw TX. Pass false to disable.
     */
     setRawTx(options: false | {
      /** (required) name of interface to send on */
      interfaceName: string
      /** whether to skip the traffic shaping (qdisc) on the interface */
      skipQdisc?: boolean
      /** AF_PACKET socket send queue */
      sndBuf?: number
    }): Promise<void>;

    /**
     * Get port at which UDP socket is bound
     */
    getLocalPort(): number;

    /**
     * Create a new transport object and register it with the remote ICE
     * username and password
     * @param {Object|SDPInfo}  remoteInfo	- Remote ICE and DTLS properties
     * @param {Object|ICEInfo}  remoteInfo.ice	- Remote ICE info, containing the
     *     username and password.
     * @param {Object|DTLSInfo} remoteInfo.dtls	- Remote DTLS info
     * @param {Array.CandidateInfo|Array.Object} remoteInfo.candidates - Remote ICE
     *     candidate info
     * @param {Object}   localInfo		- Local ICE and DTLS properties
     *     (optional)
     * @param {ICEInfo}  localInfo.ice		- Local ICE info, containing the username
     *     and password. Local ICE candidates list is not really used at all.
     * @param {DTLSInfo} localInfo.dtls		- Local DTLS info
     * @param {Array.CandidateInfo} localInfo.candidates - Local candidate info
     * @param {Object} options		- Dictionary with transport properties
     * @param {boolean} options.disableSTUNKeepAlive - Disable ICE/STUN keep
     *     alives, required for server to server transports
     * @param {String} options.srtpProtectionProfiles - Colon delimited list of
     *     SRTP protection profile names
     * @returns {Transport}	New transport object
     */
    createTransport(
        remoteInfo: SemanticSDP.SDPInfo|SemanticSDP.SDPInfoPlain,
        localInfo?: SemanticSDP.SDPInfo|SemanticSDP.SDPInfoPlain,
        options?: CreateTransportOptions): Transport;

    /**
     * Get local ICE candidates for this endpoint. It will be shared by all the
     * transport associated to this endpoint.
     * @returns {Array.CandidateInfo}
     */
    getLocalCandidates(): SemanticSDP.CandidateInfo[];

    /**
     * Get local DTLS fingerprint for this endpoint. It will be shared by all
     * the transport associated to this endpoint.
     * @returns {String}
     */
    getDTLSFingerprint(): string;

    /**
     * Helper that creates an offer from capabilities
     * It generates a random ICE username and password and gets endpoint
     * fingerprint
     * @param {Object} capabilities - Media capabilities as required by
     *     SDPInfo.create
     * @returns {SDPInfo} - SDP offer
     */
    createOffer(capabilities: MediaCapabilities): SemanticSDP.SDPInfo;

    /**
     * Create new peer connection server to manage remote peer connection
     * clients
     * @param {TransactionManager} tm
     * @param {Object} capabilities - Same as SDPInfo.answer capabilites
     * @returns {PeerConnectionServer}
     */
    createPeerConnectionServer(tm: any, capabilities: MediaCapabilities):
        PeerConnectionServer;

    /**
     * Create new active speaker multiplexer for given outgoing tracks
     * @param streamOrTracks - Outgoing stream or outgoing stream track array to be multiplexed
     */
    createActiveSpeakerMultiplexer(
      streamOrTracks: OutgoingStream|OutgoingStreamTrack[]): ActiveSpeakerMultiplexer;

    /**
     * Mirror incoming stream from another endpoint. Used to avoid inter-thread
     * synchronization when attaching multiple output streams. The endpoint will
     * cache the cucrrent mirrored streams and return an already existing object
     * if calling this method twice with same stream.
     * @param incomingStream - stream to mirror
     * @returns mirrored stream
     */
    mirrorIncomingStream(incomingStream: IncomingStream): IncomingStream;

    /**
     * Mirror incoming stream track from another endpoint. Used to avoid
     * inter-thread synchronization when attaching multiple output tracks. The
     * endpoint will cache the cucrrent mirrored tracks and return an already
     * existing object if calling this method twice with same track.
     * @param incomingStreamTrack - track to mirror
     * @returns mirrored track
     */
    mirrorIncomingStreamTrack(incomingStreamTrack: IncomingStreamTrack):
        IncomingStreamTrack;

    /**
     * Create new SDP manager, this object will manage the SDP O/A for you and
     * produce a suitable transport.
     * @param sdpSemantics - Type of sdp plan
     * @param capabilities - Capabilities objects
     */
    createSDPManager(
        sdpSemantics: 'unified-plan'|'plan-b',
        capabilities: MediaCapabilities): SDPManager;

    /**
     * Stop the endpoint UDP server and terminate any associated transport
     */
    stop(): void;
  }

  interface TransponderEventMap {
    stopped(transponder: Transponder): void;
    muted(muted: boolean): void;
  }

  export interface Transponder {
    // copy-pasted code for type-safe events
    emit<E extends keyof TransponderEventMap>(event: E, ...args: Parameters<TransponderEventMap[E]>): this;
    on<E extends keyof TransponderEventMap>(event: E, listener: TransponderEventMap[E]): this;
    once<E extends keyof TransponderEventMap>(event: E, listener: TransponderEventMap[E]): this;
    off<E extends keyof TransponderEventMap>(event: E, listener: TransponderEventMap[E]): this;
    addListener<E extends keyof TransponderEventMap>(event: E, listener: TransponderEventMap[E]): this;
    removeListener<E extends keyof TransponderEventMap>(event: E, listener: TransponderEventMap[E]): this;

    /**
     * Set incoming track
     * @param track Incoming track to attach to
     * @param layers [Optional] Only applicable to video tracks
     * @param smooth Wait until next valid frame before switching to the new encoding
     */
    setIncomingTrack(track: IncomingStreamTrack, layers?: LayerSelection, smooth?: boolean): void;

    /**
     * Set out of band negotiated H264 parameter sets
     * @param sprop - H264 parameters sets
     */
    appendH264ParameterSets(sprop: string): void;

    /**
     * Get Transponder media type
     */
    getMedia(): SemanticSDP.MediaType;

    /**
     * Get attached track
     */
    getIncomingTrack(): IncomingStreamTrack;

    /**
     * Get available encodings and layers
     */
    getAvailableLayers(): ActiveLayers|null;

    /**
     * Check if the track is muted or not
     */
    isMuted(): boolean;

    /**
     * Mute/Unmute track
     * This operation will not change the muted state of the stream this track
     * belongs too.
     * @param muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Set intra frame forwarding mode
     * @param intraOnlyForwarding true if you want to forward only intra frames, false otherwise
     */
    setIntraOnlyForwarding(intraOnlyForwarding: boolean): void;

    /**
     * Select encoding and temporal and spatial layers based on the desired
     * bitrate. This operation will unmute the transponder if it was muted and
     * it is possible to select an encoding and layer based on the target
     * bitrate and options.
     *
     * @param target - Target bitrate
     * @param options - Options for configuring algorithm to select best encoding/layers
     * @returns Current bitrate of the selected encoding and layers, it also incudes
     * the selected layer indexes and available layers as properties of the Number object.
     */
    setTargetBitrate(target: number, options?: SetTargetBitrateOptions): number & SetTargetBitrateResult;

    /**
     * Select the simulcast encoding layer and svc layers
     * @param layers - [Optional] Only applicable to video tracks
     * @param smooth - Wait until next valid frame before switching to the new encoding
     */
    select(layers?: LayerSelection, smooth?: boolean): void;

    /**
     * Select the simulcast encoding layer
     * @param encodingId - rid value of the simulcast encoding of the track
     */
    selectEncoding(encodingId: string): void;

    /**
     * Return the encoding that is being forwarded
     */
    getSelectedEncoding(): string;

    /**
     * Return the spatial layer id that is being forwarded
     */
    getSelectedSpatialLayerId(): number;

    /**
     * Return the temporal layer id that is being forwarded
     */
    getSelectedTemporalLayerId(): number;

    /**
     * Get current selected layer info
     */
    getSelectedLayer(): Layer;

    /**
     * Select SVC temporatl and spatial layers. Only available for VP9 media.
     * @param spatialLayerId - The spatial layer id to send to the outgoing stream
     * @param temporalLayerId - The temporal layer id to send to the outgoing stream
     */
    selectLayer(spatialLayerId: number, temporalLayerId: number): void;

    /**
     * Set maximum spatial and temporal layers to be forwarded. Base layer is
     * always enabled.
     * @param maxSpatialLayerId - Max spatial layer id
     * @param maxTemporalLayerId - Max temporal layer id
     */
    setMaximumLayers(maxSpatialLayerId: number, maxTemporalLayerId: number):
        void;

    /**
     * Stop this transponder, will detach the OutgoingStreamTrack
     */
    stop(): void;
  }

  export interface MediaServer {
    /**
     * Close async handlers so nodejs can exit nicely
     * Only call it once!
     * @memberof MediaServer
     */
    terminate(): void;

    /**
     * Enable or disable log level traces
     * @memberof MediaServer
     * @param {Boolean} flag
     */
    enableLog(flag: boolean): void;

    /**
     * Enable or disable debug level traces
     * @memberof MediaServer
     * @param {Boolean} flag
     */
    enableDebug(flag: boolean): void;

    /**
     * Set UDP port range for encpoints
     * @memberof MediaServer
     * @param {Integer} minPort - Min UDP port
     * @param {Integer} maxPort - Max UDP port
     * @returns {Endpoint} The new created endpoing
     */
    setPortRange(minPort: number, maxPort: number): boolean;

    /**
     * Set node uv loop cpu affinity
     * @memberof MediaServer
     * @param {Integer} cpu - CPU core number
     * @returns {boolean} true if operation was successful
     */
    setAffinity(cpu: number): boolean;

    /**
     * Set node uv loop thread name.
     *
     * Useful for debugging or tracing. Currently only supported
     * on Linux, fails on other platforms.
     * Length is limited to 16 bytes.
     * @param {String}  name - thread name to set
     * @returns {boolean} true if operation was successful
     */
     setThreadName(name: string): boolean;

    /**
     * Enable or disable ultra debug level traces
     * @memberof MediaServer
     * @param {Boolean} flag
     */
    enableUltraDebug(flag: boolean): void;

    /**
     * Create a new endpoint object
     * @memberof MediaServer
     * @param {String | String[]} ip	- External IP address(es) of server, to be
     * used when announcing the local ICE candidate
     * @returns {Endpoint} The new created endpoing
     */
    createEndpoint(ip: string | string[]): Endpoint;

    /**
     * Create a new MP4 recorder
     * @memberof MediaServer
     * @param {String} filename - Path and filename of the recorded mp4 file
     * @param {Object} params - Recording parameters (Optional)
     * @param {Object} params.refresh - Periodically refresh an intra on all
     *     video tracks (in ms)
     * @param {Object} params.waitForIntra - Wait until first video iframe is
     *     received to start recording media
     * @returns {Recorder}
     */
    createRecorder(filename: string, params?: CreateRecorderOptions): Recorder;

    /**
     * Create a new MP4 player
     * @memberof MediaServer
     * @param {String} filename - Path and filename of the mp4 file
     * @returns {Player}
     */
    createPlayer(filename: string): Player;

    /**
     * Create a new RTP streamer
     * @memberof MediaServer
     * @returns {Streamer}
     */
    createStreamer(): Streamer;

    /**
     * Create a new Active Speaker Detecrtor
     */
    createActiveSpeakerDetector(): ActiveSpeakerDetector;

    /**
     * Create a new stream refresher
     * @param {type} period - Intra refresh period
     */
    createRefresher(period: number): Refresher;

    /**
     * Create a new emulated transport from pcap file
     * @param {String} filename - PCAP filename and path
     */
    createEmulatedTransport(filename: string): EmulatedTransport;

    /**
     * Get the default media server capabilities for each supported media type
     * @returns {Object} Object containing the capabilities by media ("audio","video")
     */
    getDefaultCapabilities(): MediaCapabilities;
  }

  interface IncomingStreamEventMap {
    track(track: IncomingStreamTrack): void;
    stopped(stream: IncomingStream, stats: IncomingStreamStats): void;
  }

  export interface IncomingStream {
    // copy-pasted code for type-safe events
    emit<E extends keyof IncomingStreamEventMap>(event: E, ...args: Parameters<IncomingStreamEventMap[E]>): this;
    on<E extends keyof IncomingStreamEventMap>(event: E, listener: IncomingStreamEventMap[E]): this;
    once<E extends keyof IncomingStreamEventMap>(event: E, listener: IncomingStreamEventMap[E]): this;
    off<E extends keyof IncomingStreamEventMap>(event: E, listener: IncomingStreamEventMap[E]): this;
    addListener<E extends keyof IncomingStreamEventMap>(event: E, listener: IncomingStreamEventMap[E]): this;
    removeListener<E extends keyof IncomingStreamEventMap>(event: E, listener: IncomingStreamEventMap[E]): this;

    /**
     * The media stream id as announced on the SDP
     * @returns {String}
     */
    getId(): string;

    /**
     * Get the stream info object for signaling the ssrcs and stream info on the
     * SDP from the remote peer
     * @returns {StreamInfo} The stream info object
     */
    getStreamInfo(): SemanticSDP.StreamInfo;

    /**
     * Get statistics for all tracks in the stream
     */
    getStats(): IncomingStreamStats;

    /**
     * Check if the stream is muted or not
     */
    isMuted(): boolean;

    /**
     * Mute/Unmute this stream and all the tracks in it
     * @param {boolean} muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Get track by id
     * @param trackId	- The track id
     * @returns requested track, or undefined if not found
     */
    getTrack(trackId: string): IncomingStreamTrack | undefined;

    /**
     * Get all the tracks
     * @param type - The media type (Optional)
     */
    getTracks(type?: SemanticSDP.MediaType): IncomingStreamTrack[];

    /**
     * Get an array of the media stream audio tracks
     * @returns {Array<IncomingStreamTrack>}	- Array of tracks
     */
    getAudioTracks(): IncomingStreamTrack[];

    /**
     * Get an array of the media stream video tracks
     * @returns {Array<IncomingStreamTrack>}	- Array of tracks
     */
    getVideoTracks(): IncomingStreamTrack[];

    /**
     * Adds an incoming stream track created using the
     * Transpocnder.createIncomingStreamTrack to this stream
     *
     * @param {IncomingStreamTrack} track
     */
    addTrack(track: IncomingStreamTrack): void;

    /**
     * Create new track from a TrackInfo object and add it to this stream
     */
    createTrack(trackInfo: SemanticSDP.TrackInfo): IncomingStreamTrack;

    /**
     * Reset ssrc state of all tracks
     */
    reset(): void;

    /**
     * Return if the stream is attached or not
     */
    isAttached(): boolean;

    /**
     * Removes the media strem from the transport and also detaches from any
     * attached incoming stream
     */
    stop(): void;
  }

  interface IncomingStreamTrackEventMap {
    attached(track: IncomingStreamTrack): void;
    detached(track: IncomingStreamTrack): void;
    stopped(track: IncomingStreamTrack): void;
  }

  export interface IncomingStreamTrack {
    // copy-pasted code for type-safe events
    emit<E extends keyof IncomingStreamTrackEventMap>(event: E, ...args: Parameters<IncomingStreamTrackEventMap[E]>): this;
    on<E extends keyof IncomingStreamTrackEventMap>(event: E, listener: IncomingStreamTrackEventMap[E]): this;
    once<E extends keyof IncomingStreamTrackEventMap>(event: E, listener: IncomingStreamTrackEventMap[E]): this;
    off<E extends keyof IncomingStreamTrackEventMap>(event: E, listener: IncomingStreamTrackEventMap[E]): this;
    addListener<E extends keyof IncomingStreamTrackEventMap>(event: E, listener: IncomingStreamTrackEventMap[E]): this;
    removeListener<E extends keyof IncomingStreamTrackEventMap>(event: E, listener: IncomingStreamTrackEventMap[E]): this;

    /**
     * Get stats for all encodings
     */
    getStats(): IncomingStreamTrackStats;

    /**
     * Get active encodings and layers ordered by bitrate
     * @returns {Object} Active layers object containing an array of active and
     *     inactive encodings and an array of all available layer info
     */
    getActiveLayers(): ActiveLayers;

    /**
     * Get track id as signaled on the SDP
     */
    getId(): string;

    /**
     * Get track media id
     */
    getMediaId(): string;

    /**
     * Get track info object
     * @returns {TrackInfo} Track info
     */
    getTrackInfo(): SemanticSDP.TrackInfo;

    /**
     * Return ssrcs associated to this track
     * @returns {Object}
     */
    getSSRCs(): {[encodingID: string]: SSRCs};

    /**
     * Get track media type
     * @returns {String} "audio"|"video"
     */
    getMedia(): SemanticSDP.MediaType;

    /**
     * Signal that this track has been attached.
     * Internal use, you'd beter know what you are doing before calling this
     * method
     */
    attached(): void;

    /**
     * Request an intra refres on all sources
     */
    refresh(): void;

    /** 
     * Reset state of incoming sources
     */
    reset(): void;

    /**
     * Check if the track is muted or not
     */
    isMuted(): boolean;

    /**
     * Mute/Unmute track
     * @param muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Return if the track is attached or not
     */
    isAttached(): boolean;

    /**
     * Signal that this track has been detached.
     * Internal use, you'd beter know what you are doing before calling this
     * method
     */
    detached(): void;

    /**
     * Removes the track from the incoming stream and also detaches any attached
     * outgoing track or recorder
     */
    stop(): void;
  }

  interface PeerConnectionServerEventMap {
    stopped(server: PeerConnectionServer): void;
    transport(transport: Transport): void;
  }

  export interface PeerConnectionServer {
    // copy-pasted code for type-safe events
    emit<E extends keyof PeerConnectionServerEventMap>(event: E, ...args: Parameters<PeerConnectionServerEventMap[E]>): this;
    on<E extends keyof PeerConnectionServerEventMap>(event: E, listener: PeerConnectionServerEventMap[E]): this;
    once<E extends keyof PeerConnectionServerEventMap>(event: E, listener: PeerConnectionServerEventMap[E]): this;
    off<E extends keyof PeerConnectionServerEventMap>(event: E, listener: PeerConnectionServerEventMap[E]): this;
    addListener<E extends keyof PeerConnectionServerEventMap>(event: E, listener: PeerConnectionServerEventMap[E]): this;
    removeListener<E extends keyof PeerConnectionServerEventMap>(event: E, listener: PeerConnectionServerEventMap[E]): this;

    /**
     * Stop the peerconnection server, will not stop the transport created by it
     */
    stop(): void;
  }

  interface OutgoingStreamTrackEventMap {
    stopped(track: OutgoingStreamTrack): void;
    remb(bitrate: number, track: OutgoingStreamTrack): void;
    muted(muted: boolean): void;
  }

  export interface OutgoingStreamTrack {
    // copy-pasted code for type-safe events
    emit<E extends keyof OutgoingStreamTrackEventMap>(event: E, ...args: Parameters<OutgoingStreamTrackEventMap[E]>): this;
    on<E extends keyof OutgoingStreamTrackEventMap>(event: E, listener: OutgoingStreamTrackEventMap[E]): this;
    once<E extends keyof OutgoingStreamTrackEventMap>(event: E, listener: OutgoingStreamTrackEventMap[E]): this;
    off<E extends keyof OutgoingStreamTrackEventMap>(event: E, listener: OutgoingStreamTrackEventMap[E]): this;
    addListener<E extends keyof OutgoingStreamTrackEventMap>(event: E, listener: OutgoingStreamTrackEventMap[E]): this;
    removeListener<E extends keyof OutgoingStreamTrackEventMap>(event: E, listener: OutgoingStreamTrackEventMap[E]): this;

    /**
     * Get track id as signaled on the SDP
     */
    getId(): string;

    /**
     * Get track media type
     */
    getMedia(): SemanticSDP.MediaType;

    /**
     * Get track media id
     */
    getMediaId(): string;

    /**
     * Get track info object
     */
    getTrackInfo(): SemanticSDP.TrackInfo;

    /**
     * Get stats for all encodings
     */
    getStats(): OutgoingStreamTrackStats;

    /**
     * Return ssrcs associated to this track
     * @returns {Object}
     */
    getSSRCs(): SSRCs;

    /**
     * Check if the track is muted or not
     */
    isMuted(): boolean;

    /**
     * Mute/Unmute track
     * This operation will not change the muted state of the stream this track
     * belongs too.
     * @param muting if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Listen media from the incoming stream track and send it to the remote peer of the associated transport.
     * This will stop any previous transpoder created by a previous attach.
     * @param incomingStreamTrack - The incoming stream to listen media for
     * @param layers - [Optional] Only applicable to video tracks
     * @returns Track transponder object
     */
    attachTo(incomingStreamTrack: IncomingStreamTrack, layers?: LayerSelection): Transponder;

    /**
     * Check if this outgoing stream track is already attached to an incoming stream track
     */
    isAttached(): boolean;

    /**
     * Stop forwarding any previous attached track.
     * This will set the transponder inconming track to null
     */
    detach(): void;

    /**
     * Get attached transpoder for this track
     * @returns {Transponder} Attached transpoder or null if not attached
     */
    getTransponder(): Transponder;

    /**
     * Removes the track from the outgoing stream and also detaches from any
     * attached incoming track
     */
    stop(): void;
  }

  export interface Recorder {
    /**
     * Start recording and incoming
     * @param {IncomingStream|IncomingStreamTrack} incomingStreamOrTrack -
     *     Incomining stream or track to be recordeds
     */
    record(incomingStreamOrTrack: IncomingStream|
           IncomingStreamTrack): RecorderTrack[];

    /**
     * Stop recording and close file. NOTE: File will be flush async,
     */
    stop(): void;
  }

  interface RecorderTrackEventMap {
    stopped(track: RecorderTrack): void;
  }

  export interface RecorderTrack {
    // copy-pasted code for type-safe events
    emit<E extends keyof RecorderTrackEventMap>(event: E, ...args: Parameters<RecorderTrackEventMap[E]>): this;
    on<E extends keyof RecorderTrackEventMap>(event: E, listener: RecorderTrackEventMap[E]): this;
    once<E extends keyof RecorderTrackEventMap>(event: E, listener: RecorderTrackEventMap[E]): this;
    off<E extends keyof RecorderTrackEventMap>(event: E, listener: RecorderTrackEventMap[E]): this;
    addListener<E extends keyof RecorderTrackEventMap>(event: E, listener: RecorderTrackEventMap[E]): this;
    removeListener<E extends keyof RecorderTrackEventMap>(event: E, listener: RecorderTrackEventMap[E]): this;

    /**
     * Get recorder track id
     */
    getId(): string;

    /**
     * Get incoming stream track
     * @returns {IncomingStreamTrack}
     */
    getTrack(): IncomingStreamTrack;

    /**
     * Get incoming encoding
     * @returns {Object}
     */
    getEncoding(): Encoding;

    /**
     * Stop recording this track
     */
    stop(): void;

    /**
     * Check if the track is muted or not
     */
    isMuted(): boolean;
    
    /**
     * Mute/Unmute track
     * This operation will not change the muted state of the stream this track belongs too.
     * @param {boolean} muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;
  }

  interface PlayerEventMap {
    stopped(track: Player): void;
    ended(track: Player): void;
  }

  export interface Player {
    // copy-pasted code for type-safe events
    emit<E extends keyof PlayerEventMap>(event: E, ...args: Parameters<PlayerEventMap[E]>): this;
    on<E extends keyof PlayerEventMap>(event: E, listener: PlayerEventMap[E]): this;
    once<E extends keyof PlayerEventMap>(event: E, listener: PlayerEventMap[E]): this;
    off<E extends keyof PlayerEventMap>(event: E, listener: PlayerEventMap[E]): this;
    addListener<E extends keyof PlayerEventMap>(event: E, listener: PlayerEventMap[E]): this;
    removeListener<E extends keyof PlayerEventMap>(event: E, listener: PlayerEventMap[E]): this;

    /**
     * Get all the tracks
     * @returns {Array<IncomingStreamTrack>}	- Array of tracks
     */
    getTracks(): IncomingStreamTrack[];

    /**
     * Get an array of the media stream audio tracks
     * @returns {Array<IncomingStreamTrack>}	- Array of tracks
     */
    getAudioTracks(): IncomingStreamTrack[];

    /**
     * Get an array of the media stream video tracks
     * @returns {Array<IncomingStreamTrack>}	- Array of tracks
     */
    getVideoTracks(): IncomingStreamTrack[];

    /**
     * Starts playback
     * @param {Object} params
     * @param {Object} params.repeat - Repeat playback when file is ended
     */
    play(params?: PlayerPlayOptions): void;

    /**
     * Resume playback
     */
    resume(): void;

    /**
     * Pause playback
     */
    pause(): void;

    /**
     * Start playback from given time
     * @param {Number} time - in miliseconds
     */
    seek(time: number): void;

    /**
     * Stop playing and close file
     */
    stop(): void;
  }

  interface EmulatedTransportEventMap {
    stopped(track: EmulatedTransport): void;
  }

  export interface EmulatedTransport {
    // copy-pasted code for type-safe events
    emit<E extends keyof EmulatedTransportEventMap>(event: E, ...args: Parameters<EmulatedTransportEventMap[E]>): this;
    on<E extends keyof EmulatedTransportEventMap>(event: E, listener: EmulatedTransportEventMap[E]): this;
    once<E extends keyof EmulatedTransportEventMap>(event: E, listener: EmulatedTransportEventMap[E]): this;
    off<E extends keyof EmulatedTransportEventMap>(event: E, listener: EmulatedTransportEventMap[E]): this;
    addListener<E extends keyof EmulatedTransportEventMap>(event: E, listener: EmulatedTransportEventMap[E]): this;
    removeListener<E extends keyof EmulatedTransportEventMap>(event: E, listener: EmulatedTransportEventMap[E]): this;

    /**
     * Set remote RTP properties
     * @param {Object|SDPInfo} rtp - Object param containing media information
     *     for audio and video
     * @param {MediaInfo} rtp.audio	- Audio media info
     * @param {MediaInfo} rtp.video	- Video media info
     */
    setRemoteProperties(rtp: SemanticSDP.SDPInfo|
                        SetTransportPropertiesOptions): void;

    /**
     * Create an incoming stream object from the media stream info objet
     * @param {StreamInfo} info Contains the ids and ssrcs of the stream to be
     *     created
     * @returns {IncomingStream} The newly created incoming stream object
     */
    createIncomingStream(info: SemanticSDP.StreamInfo|
                         SemanticSDP.StreamInfoPlain): IncomingStream;

    /**
     * Starts playback
     * @param {Object} params
     * @param {Object} params.start - Set start time
     */
    play(params?: EmulatedTransportPlayOptions): void;

    /**
     * Resume playback
     */
    resume(): void;

    /**
     * Resume playback
     */
    resume(): void;

    /**
     * Start playback from given time
     * @param {Number} time - in miliseconds
     */
    seek(time: number): void;

    /**
     * Stop transport and all the associated incoming and outgoing streams
     */
    stop(): void;
  }

  /**
   * An streamer allows to send and receive plain RTP over udp sockets.
   * This allows both to bridge legacy enpoints or integrate
   * streaming/broadcasting services.
   */
  export interface Streamer {
    /**
     * Creates a new streaming session from a media description
     * @param {MediaInfo} media - Media codec description info
     * @param {Object} params		- Network parameters
     * @param {Object} params.local		- Local parameters
     * @param {Number} params.local.port	- receiving port
     * @param {Object} params.remote	- Remote parameters
     * @param {String} params.remote.ip	- Sending ip address
     * @param {Number} params.remote.port	- Sending port
     * @returns {StreamerSession} The new streaming session
     */
    createSession(
        media: SemanticSDP.MediaInfo,
        params: CreateStreamerSessionOptions): StreamerSession;

    /**
     * Stop all streaming sessions and frees resources
     */
    stop(): void;
  }

  interface StreamerSessionEventMap {
    stopped(s: StreamerSession): void;
  }

  /**
   * Represent the connection between a local udp port and a remote one. It
   * sends and/or receive plain RTP data.
   */
  export interface StreamerSession {
    // copy-pasted code for type-safe events
    emit<E extends keyof StreamerSessionEventMap>(event: E, ...args: Parameters<StreamerSessionEventMap[E]>): this;
    on<E extends keyof StreamerSessionEventMap>(event: E, listener: StreamerSessionEventMap[E]): this;
    once<E extends keyof StreamerSessionEventMap>(event: E, listener: StreamerSessionEventMap[E]): this;
    off<E extends keyof StreamerSessionEventMap>(event: E, listener: StreamerSessionEventMap[E]): this;
    addListener<E extends keyof StreamerSessionEventMap>(event: E, listener: StreamerSessionEventMap[E]): this;
    removeListener<E extends keyof StreamerSessionEventMap>(event: E, listener: StreamerSessionEventMap[E]): this;

    /**
     * Returns the incoming stream track associated with this streaming session
     * @returns {IncomingStreamTrack}
     */
    getIncomingStreamTrack(): IncomingStreamTrack;

    /**
     * Returns the outgoing stream track associated with this streaming session
     * @returns {OutgoingStreamTrack}
     */
    getOutgoingStreamTrack(): OutgoingStreamTrack;

    /**
     * Closes udp socket and frees resources
     */
    stop(): void;
  }

  interface RefresherEventMap {
    stopped(r: Refresher): void;
    refreshing(r: Refresher): void;
  }

  /**
   * Periodically request an I frame on all incoming stream or tracks
   */
  export interface Refresher {
    // copy-pasted code for type-safe events
    emit<E extends keyof RefresherEventMap>(event: E, ...args: Parameters<RefresherEventMap[E]>): this;
    on<E extends keyof RefresherEventMap>(event: E, listener: RefresherEventMap[E]): this;
    once<E extends keyof RefresherEventMap>(event: E, listener: RefresherEventMap[E]): this;
    off<E extends keyof RefresherEventMap>(event: E, listener: RefresherEventMap[E]): this;
    addListener<E extends keyof RefresherEventMap>(event: E, listener: RefresherEventMap[E]): this;
    removeListener<E extends keyof RefresherEventMap>(event: E, listener: RefresherEventMap[E]): this;

    /**
     * Add stream or track to request
     */
    add(streamOrTrack: IncomingStream|IncomingStreamTrack): void;

    /**
     * Stop refresher
     */
    stop(): void;
  }

  interface SDPManagerEventMap {
    renegotiationneeded(transport: Transport): void;
    transport(transport: Transport): void;
  }

  export interface SDPManager {
    // copy-pasted code for type-safe events
    emit<E extends keyof SDPManagerEventMap>(event: E, ...args: Parameters<SDPManagerEventMap[E]>): this;
    on<E extends keyof SDPManagerEventMap>(event: E, listener: SDPManagerEventMap[E]): this;
    once<E extends keyof SDPManagerEventMap>(event: E, listener: SDPManagerEventMap[E]): this;
    off<E extends keyof SDPManagerEventMap>(event: E, listener: SDPManagerEventMap[E]): this;
    addListener<E extends keyof SDPManagerEventMap>(event: E, listener: SDPManagerEventMap[E]): this;
    removeListener<E extends keyof SDPManagerEventMap>(event: E, listener: SDPManagerEventMap[E]): this;

    /**
     * Get current SDP offer/answer state
     */
    getState(): 'initial'|'local-offer'|'remote-offer'|'stable';

    /**
     * Returns the Transport object created by the SDP O/A
     */
    getTransport(): Transport;

    /**
     * Create local description
     */
    createLocalDescription(): string;

    /**
     * Process remote offer
     * @param sdp - Remote session description
     */
    processRemoteDescription(sdp: string): void;

    /**
     * Stop manager and associated tranports
     */
    stop(): void;
  }

  interface ActiveSpeakerDetectorEventMap {
    activespeakerchanged(track: IncomingStreamTrack): void;
    stopped(): void;
  }

  export interface ActiveSpeakerDetector {
    // copy-pasted code for type-safe events
    emit<E extends keyof ActiveSpeakerDetectorEventMap>(event: E, ...args: Parameters<ActiveSpeakerDetectorEventMap[E]>): this;
    on<E extends keyof ActiveSpeakerDetectorEventMap>(event: E, listener: ActiveSpeakerDetectorEventMap[E]): this;
    once<E extends keyof ActiveSpeakerDetectorEventMap>(event: E, listener: ActiveSpeakerDetectorEventMap[E]): this;
    off<E extends keyof ActiveSpeakerDetectorEventMap>(event: E, listener: ActiveSpeakerDetectorEventMap[E]): this;
    addListener<E extends keyof ActiveSpeakerDetectorEventMap>(event: E, listener: ActiveSpeakerDetectorEventMap[E]): this;
    removeListener<E extends keyof ActiveSpeakerDetectorEventMap>(event: E, listener: ActiveSpeakerDetectorEventMap[E]): this;

    /**
     * Set minimum period between active speaker changes
     * @param {Number} minChangePeriod
     */
    setMinChangePeriod(minChangePeriod: number): void;

    /**
     * Maximux activity score accumulated by an speaker
     * @param {Number} maxAcummulatedScore
     */
    setMaxAccumulatedScore(maxAcummulatedScore: number): void;

    /**
     * Minimum db level to not be considered as muted
     * @param {Number} noiseGatingThreshold
     */
    setNoiseGatingThreshold(noiseGatingThreshold: number): void;

    /**
     * Set minimum activation score to be electible as active speaker
     * @param {Number} minActivationScore
     */
    setMinActivationScore(minActivationScore: number): void;

    /**
     * Add incoming track for speaker detection
     * @param {IncomingStreamTrack} track
     */
    addSpeaker(track: IncomingStreamTrack): void;

    /**
     * Remove track from speaker detection
     * @param {IncomingStreamTrakc} track
     */
    removeSpeaker(track: IncomingStreamTrack): void;

    /**
     * Stop this transponder, will detach the OutgoingStreamTrack
     */
    stop(): void;
  }

  interface ActiveSpeakerMultiplexerEventMap {
    /**
     * new active speaker detected event
     * @param incomingStreamTrack - Track that has been voice activated
     * @param outgoingStreamTrack - Track that has been multiplexed into
     */
    activespeakerchanged(incomingStreamTrack: IncomingStreamTrack, outgoingStreamTrack: OutgoingStreamTrack): void;
    /**
     * active speaker removed event
     * @param outgoingStreamTrack - Track with no active speaker
     */
    noactivespeaker(outgoingStreamTrack: OutgoingStreamTrack): void;
    stopped(): void;
  }

  /**
   * multiplex multiple incoming audio tracks into fewer outgoing tracks based on voice activity.
   */
  export interface ActiveSpeakerMultiplexer {
    // copy-pasted code for type-safe events
    emit<E extends keyof ActiveSpeakerMultiplexerEventMap>(event: E, ...args: Parameters<ActiveSpeakerMultiplexerEventMap[E]>): this;
    on<E extends keyof ActiveSpeakerMultiplexerEventMap>(event: E, listener: ActiveSpeakerMultiplexerEventMap[E]): this;
    once<E extends keyof ActiveSpeakerMultiplexerEventMap>(event: E, listener: ActiveSpeakerMultiplexerEventMap[E]): this;
    off<E extends keyof ActiveSpeakerMultiplexerEventMap>(event: E, listener: ActiveSpeakerMultiplexerEventMap[E]): this;
    addListener<E extends keyof ActiveSpeakerMultiplexerEventMap>(event: E, listener: ActiveSpeakerMultiplexerEventMap[E]): this;
    removeListener<E extends keyof ActiveSpeakerMultiplexerEventMap>(event: E, listener: ActiveSpeakerMultiplexerEventMap[E]): this;

    /**
     * Set minimum period between active speaker changes
     */
    setMinChangePeriod(minChangePeriod: number): void;
    
    /**
     * Maximux activity score accumulated by an speaker
     */
    setMaxAccumulatedScore(maxAcummulatedScore: number): void;
    
    /**
     * Minimum db level to not be considered as muted
     */
    setNoiseGatingThreshold(noiseGatingThreshold: number): void;
    
    /**
     * Set minimum activation score to be electible as active speaker
     */
    setMinActivationScore(minActivationScore: number): void;
    
    /**
     * Add incoming track for speaker detection
     */
    addSpeaker(track: IncomingStreamTrack): void;

    /**
     * Remove track from speaker detection
     */
    removeSpeaker(track: IncomingStreamTrack): void;

    /**
     * Stop this transponder, will detach the OutgoingStreamTrack
     */
    stop(): void;
  }
}

declare const _default: _default.MediaServer;
export = _default;
