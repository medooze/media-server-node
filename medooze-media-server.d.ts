declare module 'medooze-media-server' {
import SemanticSDP = require('semantic-sdp');

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

  export interface LayerStats {
    /** Spatial layer id */
    spatialLayerId: number;
    /** Temporatl layer id */
    temporalLayerId: number;
    /** total rtp received bytes for this layer */
    totalBytes: number;
    /** number of rtp packets received for this layer */
    numPackets: number;
    /** average bitrate received during last second for this layer */
    bitrate: number;
  }

  export interface IncomingSourceStats {
    /** total lost packkets */
    lostPackets: number;
    /** droppted packets by media server */
    dropPackets: number;
    /** number of rtp packets received */
    numPackets: number;
    /** number of rtcp packsets received */
    numRTCPPackets: number;
    /** total rtp received bytes */
    totalBytes: number;
    /** total rtp received bytes */
    totalRTCPBytes: number;
    /** total PLIs sent */
    totalPLIs: number;
    /** total NACk packets setn */
    totalNACKs: number;
    /** average bitrate received during last second in bps */
    bitrate: number;
    /** Information about each spatial/temporal layer (if present) */
    layers: LayerStats[];
  }

  export interface OutgoingSourceStats {
    /** number of rtp packets sent */
    numPackets: number;
    /** number of rtcp packsets sent */
    numRTCPPackets: number;
    /** total rtp sent bytes */
    totalBytes: number;
    /** total rtp sent bytes */
    totalRTCPBytes: number;
    /** average bitrate sent during last second in bps */
    bitrate: number;
  }

  export interface OutgoingStreamTrackStats {
    media: OutgoingSourceStats;
    rtx: OutgoingSourceStats;
    fec: OutgoingSourceStats;
    timestamp: number;
  }

  export interface OutgoingStreamStatsReport {
    [trackID: string]: OutgoingStreamTrackStats;
  }

  export interface IncomingStreamTrackStats {
    /** Stats for the media stream */
    media: IncomingSourceStats;
    /** Stats for the rtx retransmission stream */
    rtx: IncomingSourceStats;
    /** Stats for the fec stream */
    fec: IncomingSourceStats;
    /** Round Trip Time in ms */
    rtt: number;
    /**
     * "min","max" and "avg" packet waiting times in rtp buffer before
     * delivering them
     */
    waitTime: WaitTimeStats;
    /** Bitrate for media stream only in bps */
    bitrate: number;
    /** Accumulated bitrate for rtx, media and fec streams in bps */
    total: number;
    /**
     * Estimated avialable bitrate for receving (only avaailable if not using
     * tranport wide cc)
     */
    remb: number;
    /**
     * When this stats was generated, in order to save workload, stats are
     * cached for 200ms
     */
    timestamp: number;
    /**
     * Simulcast layer index based on bitrate received (-1 if it is inactive).
     */
    simulcastIdx: number;
  }

  export interface IncomingStreamTrackStatsReport {
    [layerID: string]: IncomingStreamTrackStats;
  }
  export interface IncomingStreamStatsReport {
    [trackID: string]: IncomingStreamTrackStatsReport;
  }

  export interface CreateRecorderOptions {
    /** Periodically refresh an intra on all video tracks (in ms) */
    refresh?: number;
    /** Wait until first video iframe is received to start recording media */
    waitForIntra?: boolean;
  }

  export interface SetTargetBitrateOptions {
    /**
     * Traversal algorithm "default", "spatial-temporal",
     * "zig-zag-spatial-temporal", "temporal-spatial",
     * "zig-zag-temporal-spatial" [Default: "default"]
     */
    traversal?: 'default'|'spatial-temporal'|'zig-zag-temporal-spatial';
    /**
     * If there is not a layer with a bitrate lower thatn target, stop sending
     * media [Default: false]
     */
    strict?: boolean;
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
    srtpProtectionProfiles: boolean;
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
    /** ssrc for the rtx track */
    rtx?: number;
    /** ssrc for the fec track */
    fec?: number;
  }

  export interface CreateStreamTrackOptions {
    /** Stream track id */
    id?: string;
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

  export interface OutgoingStream {
    /**
     * Get statistics for all tracks in the stream
     *
     * See OutgoingStreamTrack.getStats for information about the stats returned
     * by each track.
     *
     * @returns {Map<String>,Object} Map with stats by trackId
     */
    getStats(): OutgoingStreamStatsReport;

    /**
     * Check if the stream is muted or not
     * @returns {boolean} muted
     */
    isMuted(): boolean;

    /*
     * Mute/Unmute this stream and all the tracks in it
     * @param {boolean} muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Listen media from the incoming stream and send it to the remote peer of
     * the associated transport.
     * @param {IncomingStream} incomingStream - The incoming stream to listen
     *     media for
     * @returns {Array<Transponder>} Track transponders array
     */
    attachTo(incomingStream: IncomingStream): Transponder[];

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
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    on(event: 'track',
       listener: (track: OutgoingStreamTrack) => any): OutgoingStream;
    on(event: 'stopped',
       listener:
           (stream: OutgoingStream, stats: OutgoingStreamStatsReport) => any):
        OutgoingStream;
    on(event: 'muted', listener: (muted: boolean) => any): OutgoingStream;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'track', listener: (track: OutgoingStreamTrack) => any):
        OutgoingStream;
    once(
        event: 'stopped',
        listener:
            (stream: OutgoingStream, stats: OutgoingStreamStatsReport) => any):
        OutgoingStream;
    once(event: 'muted', listener: (muted: boolean) => any): OutgoingStream;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {OutgoingStream}
     */
    off(event: 'track',
        listener: (track: OutgoingStreamTrack) => any): OutgoingStream;
    off(event: 'stopped',
        listener:
            (stream: OutgoingStream, stats: OutgoingStreamStatsReport) => any):
        OutgoingStream;
    off(event: 'muted', listener: (muted: boolean) => any): OutgoingStream;

    /**
     * Get all the tracks
     * @param {String} type	- The media type (Optional)
     * @returns {Array<OutgoingStreamTrack>}	- Array of tracks
     */
    getTracks(type: string): OutgoingStreamTrack[];

    /**
     * Get track by id
     * @param {String} trackId	- The track id
     * @returns {IncomingStreamTrack}	- requested track or null
     */
    getTrack(trackId: string): IncomingStreamTrack;

    /**
     * Get an array of the media stream audio tracks
     * @returns {Array|OutgoingStreamTracks}	- Array of tracks
     */
    getAudioTracks(): OutgoingStreamTrack[];

    /**
     * Get an array of the media stream video tracks
     * @returns {Array|OutgoingStreamTrack}	- Array of tracks
     */
    getVideoTracks(): OutgoingStreamTrack[];

    /*
     * Adds an incoming stream track created using the
     * Transpocnder.createOutgoingStreamTrack to this stream
     *
     * @param {OuggoingStreamTrack} track
     */
    addTrack(track: OutgoingStreamTrack): void;

    /**
     * Create new track from a TrackInfo object and add it to this stream
     * @param {Object|TrackInfo|String} params Params plain object, StreamInfo
     *     object or media type
     * @param {String?} params.id		- Stream track id
     * @param {String?} params.media	- Media type ("audio" or "video")
     * @param {Object?} params.ssrcs	- Override the generated ssrcs for this
     *     track
     * @param {Number?} params.ssrcs.media	- ssrc for the track
     * @param {Number?} params.ssrcs.rtx 	- ssrc for the rtx video track
     * @param {Number?} params.ssrcs.fec	- ssrc for the fec video track
     * @returns {OutgoingStream} The new outgoing stream
     * @param {TrackInfo} trackInfo Track info object
     * @returns {OuggoingStreamTrack}
     */
    createTrack(params: SemanticSDP.TrackInfo|SemanticSDP.TrackInfoPlain|
                string): OutgoingStream;

    stop(): void;
  }

  export interface Transport {
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
     * Enable bitrate probing.
     * This will send padding only RTX packets to allow bandwidth estimation
     * algortithm to probe bitrate beyonf current sent values. The ammoung of
     * probing bitrate would be limited by the sender bitrate estimation and the
     * limit set on the setMaxProbing Bitrate. Note that this will only work on
     * browsers that supports RTX and transport wide cc.
     * @param {Boolen} probe
     */
    setBandwidthProbing(probe: boolean): void;

    /**
     * Set the maximum bitrate to be used if probing is enabled.
     * @param {Number} bitrate
     */
    setMaxProbingBitrate(bitrate: number): void;

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
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listeener	- Event listener
     * @returns {Transport}
     */
    on(event: 'targetbitrate',
       listener: (bitrate: number, transport: Transport) => any): Transport;
    on(event: 'outgoingtrack',
       listener:
           (track: OutgoingStreamTrack, stream: OutgoingStream|null) => any):
        Transport;
    on(event: 'incomingtrack',
       listener:
           (track: IncomingStreamTrack, stream: IncomingStream|null) => any):
        Transport;
    on(event: 'stopped', listener: (transport: Transport) => any): Transport;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(
        event: 'targetbitrate',
        listener: (bitrate: number, transport: Transport) => any): Transport;
    once(
        event: 'outgoingtrack',
        listener:
            (track: OutgoingStreamTrack, stream: OutgoingStream|null) => any):
        Transport;
    once(
        event: 'incomingtrack',
        listener:
            (track: IncomingStreamTrack, stream: IncomingStream|null) => any):
        Transport;
    once(event: 'stopped', listener: (transport: Transport) => any): Transport;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transport}
     */
    off(event: 'targetbitrate',
        listener: (bitrate: number, transport: Transport) => any): Transport;
    off(event: 'outgoingtrack',
        listener:
            (track: OutgoingStreamTrack, stream: OutgoingStream|null) => any):
        Transport;
    off(event: 'incomingtrack',
        listener:
            (track: IncomingStreamTrack, stream: IncomingStream|null) => any):
        Transport;
    off(event: 'stopped', listener: (transport: Transport) => any): Transport;

    /**
     * Get transport local DTLS info
     * @returns {DTLSInfo} DTLS info object
     */
    getLocalDTLSInfo(): SemanticSDP.DTLSInfo;

    /**
     * Get transport local ICE info
     * @returns {ICEInfo} ICE info object
     */
    getLocalICEInfo(): SemanticSDP.ICEInfo;

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
     * @param {CandidateInfo} candidate
     * @returns {boolean} Wheter the remote ice candidate was alrady presnet or
     *     not
     */
    addRemoteCandidate(candidate: SemanticSDP.CandidateInfo): boolean;

    /**
     * Register an array remote candidate info. Only needed for ice-lite to
     * ice-lite endpoints
     * @param {Array.CandidateInfo} candidates
     */
    addRemoteCandidates(candidates: SemanticSDP.CandidateInfo[]): void;

    /**
     * Create new outgoing stream in this transport
     * @param {Object|StreamInfo|String} params Params plain object, StreamInfo
     *     object or stream id
     * @param {Array<Object>|Object|boolean} params.audio	- Add audio track to
     *     the new stream
     * @param {Object?} params.id	- Stream id, an UUID will be generated if not
     *     provided
     * @param {Object?} params.audio.id	- Stream track id (default: "audio")
     * @param {Number?} params.audio.ssrcs	- Override the generated ssrcs for
     *     this track
     * @param {Number?} params.audio.ssrcs.media - ssrc for the audio track
     * @param {Array<Object>|Object|boolean} params.video	- Add video track to
     *     the new stream
     * @param {Object?} params.video.id	- Stream track id (default: "video")
     * @param {Object?} params.video.ssrcs	- Override the generated ssrcs for
     *     this track
     * @param {Number?} params.video.ssrcs.media	- ssrc for the video
     *     track
     * @param {Number?} params.video.ssrcs.rtx 	- ssrc for the rtx video track
     * @param {Number?} params.video.ssrcs.fec	- ssrc for the fec video track
     * @returns {OutgoingStream} The new outgoing stream
     */
    createOutgoingStream(params: SemanticSDP.StreamInfo|
                         CreateOutgoingStreamOptions|string): OutgoingStream;

    /**
     * Create new outgoing stream in this transport
     * @param {String}  media		- Track media type "audio" or "video"
     * @param {Object?} params		- Track parameters
     * @param {Object?} params.id		- Stream track id
     * @param {Number?} params.ssrcs	- Override the generated ssrcs for this
     *     track
     * @param {Number?} params.ssrcs.media	- ssrc for the media track
     * @param {Number?} params.ssrcs.rtx 	- ssrc for the rtx track
     * @param {Number?} params.ssrcs.fec	- ssrc for the fec track
     * @returns {OutgoingStreamTrack} The new outgoing stream track
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
     * @returns {Array<IncomingStreams>}
     */
    getIncomingStreams(): IncomingStream[];

    /**
     * Get incoming stream
     * @param {String} streamId the stream ID
     * @returns {IncomingStream}
     */
    getIncomingStream(streamId: string): IncomingStream;

    /**
     * Get all the outgoing streams in the transport
     * @returns {Array<OutgoingStreams>}
     */
    getOutgoingStreams(): OutgoingStream[];

    /**
     * Get incoming stream
     * @param {String} streamId the stream ID
     * @returns {IncomingStream}
     */
    getOutgoingStream(streamId: string): OutgoingStream;

    /**
     * Create new incoming stream in this transport. TODO: Simulcast is still
     * not supported
     * @param {String}  media		- Track media type "audio" or "video"
     * @param {Object?} params		- Track parameters
     * @param {Object?} params.id		- Stream track id
     * @param {Number?} params.ssrcs	- Override the generated ssrcs for this
     *     track
     * @param {Number?} params.ssrcs.media	- ssrc for the media track
     * @param {Number?} params.ssrcs.rtx 	- ssrc for the rtx track
     * @param {Number?} params.ssrcs.fec	- ssrc for the fec track
     * @returns {IncomingStreamTrack} The new incoming stream track
     */
    createIncomingStreamTrack(
        media: SemanticSDP.MediaType,
        params?: CreateStreamTrackOptions): IncomingStreamTrack;

    /**
     * Create new outgoing stream and attach to the incoming stream
     * @param {IncomingStream} incomingStream the incoming stream to be
     *     published in this transport
     * @returns {OutgoingStream} The new outgoing stream
     */
    publish(incomingStream: IncomingStream): OutgoingStream;

    /**
     * Stop transport and all the associated incoming and outgoing streams
     */
    stop(): void;
  }

  export interface Endpoint {
    /**
     * Set cpu affinity for udp send/recv thread.
     * @param {Number}  cpu - CPU core or -1 to reset affinity.
     * @returns {boolean}
     */
    setAffinity(cpu: number): void;

    /**
     * Create a new transport object and register it with the remote ICE
     * username and password
     * @param {Object|SDPInfo}  remoteInfo	- Remote ICE and DTLS properties
     * @param {Object|ICEInfo}  remote.ice	- Remote ICE info, containing the
     *     username and password.
     * @param {Object|DTLSInfo} remote.dtls	- Remote DTLS info
     * @param {Array.CandidateInfo|Array.Object} remote.candidates - Remote ICE
     *     candidate info
     * @param {Object}   localInfo		- Local ICE and DTLS properties
     *     (optional)
     * @param {ICEInfo}  local.ice		- Local ICE info, containing the username
     *     and password. Local ICE candidates list is not really used at all.
     * @param {DTLSInfo} local.dtls		- Local DTLS info
     * @param {Array.CandidateInfo} local.candidates - Local candidate info
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
     * Mirror incoming stream from another endpoint. Used to avoid inter-thread
     * synchronization when attaching multiple output streams. The endpoint will
     * cache the cucrrent mirrored streams and return an already existing object
     * if calling this method twice with same stream.
     * @param {IncomingStream} incomingStream - stream to mirror
     * @returns {IncomingStream} mirrored stream.
     */
    mirrorIncomingStream(incomingStream: IncomingStream): IncomingStream;

    /**
     * Mirror incoming stream track from another endpoint. Used to avoid
     * inter-thread synchronization when attaching multiple output tracks. The
     * endpoint will cache the cucrrent mirrored tracks and return an already
     * existing object if calling this method twice with same track.
     * @param {IncomingStreamTrack} incomingStreamTrack - track to mirror
     * @returns {IncomingStreamTrackMirrored} mirrored track.
     */
    mirrorIncomingStreamTrack(incomingStreamTrack: IncomingStreamTrack):
        IncomingStreamTrack;

    /**
     * Create new SDP manager, this object will manage the SDP O/A for you and
     * produce a suitable trasnport.
     * @param {String} sdpSemantics - Type of sdp plan "unified-plan" or
     *     "plan-b"
     * @param {Object} capabilities - Capabilities objects
     * @returns {SDPManager}
     */
    createSDPManager(
        sdpSemantics: 'unified-plan'|'plan-b',
        capabilities: MediaCapabilities): SDPManager;

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listeener	- Event listener
     * @returns {Endpoint}
     */
    on(event: 'stopped', listener: (endpoint: Endpoint) => any): Endpoint;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Endpoint}
     */
    once(event: 'stopped', listener: (endpoint: Endpoint) => any): Endpoint;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Endpoint}
     */
    off(event: 'stopped', listener: (endpoint: Endpoint) => any): Endpoint;

    /**
     * Stop the endpoint UDP server and terminate any associated transport
     */
    stop(): void;
  }

  export interface Transponder {
    /**
     * Set incoming track
     * @param {IncomingStreamTrack} track
     */
    setIncomingTrack(track: IncomingStreamTrack): void;

    /**
     * Get attached track
     * @returns {IncomingStreamTrack} track
     */
    getIncomingTrack(): IncomingStreamTrack;

    /**
     * Get available encodings and layers
     * @returns {Object}
     */
    getAvailableLayers(): ActiveLayers|null;

    /**
     * Check if the track is muted or not
     * @returns {boolean} muted
     */
    isMuted(): boolean;

    /*
     * Mute/Unmute track
     * This operation will not change the muted state of the stream this track
     * belongs too.
     * @param {boolean} muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /*
     * Select encoding and temporal and spatial layers based on the desired
     * bitrate. This operation will unmute the transponder if it was mutted and
     * it is possible to select an encoding and layer based on the target
     * bitrate and options.
     *
     * @param {Number} bitrate
     * @param {Object} options - Options for configuring algorithm to select
     *     best encoding/layers [Optional]
     * @param {Object} options.traversal - Traversal algorithm "default",
     *     "spatial-temporal", "zig-zag-spatial-temporal", "temporal-spatial",
     *     "zig-zag-temporal-spatial" [Default: "default"]
     * @param {Object} options.strict    - If there is not a layer with a
     *     bitrate lower thatn target, stop sending media [Default: false]
     * @returns {Number} Current bitrate of the selected encoding and layers
     */
    setTargetBitrate(target: number, options?: SetTargetBitrateOptions): number;

    /*
     * Select the simulcast encoding layer
     * @param {String} encoding Id - rid value of the simulcast encoding of the
     *     track
     */
    selectEncoding(encodingId: string): void;

    /**
     * Return the encoding that is being forwarded
     * @returns {String} encodingId
     */
    getSelectedEncoding(): string;

    /**
     * Return the spatial layer id that is being forwarded
     * @returns {Number} spatial layer id
     */
    getSelectedSpatialLayerId(): number;

    /**
     * Return the temporal layer id that is being forwarded
     * @returns {Number} temporal layer id
     */
    getSelectedTemporalLayerId(): number;

    /**
     * Select SVC temporatl and spatial layers. Only available for VP9 media.
     * @param {Number} spatialLayerId The spatial layer id to send to the
     *     outgoing stream
     * @param {Number} temporalLayerId The temporaral layer id to send to the
     *     outgoing stream
     */
    selectLayer(spatialLayerId: number, temporalLayerId: number): void;

    /**
     * Set maximum statial and temporal layers to be forwrarded. Base layer is
     * always enabled.
     * @param {Number} maxSpatialLayerId  - Max spatial layer id
     * @param {Number} maxTemporalLayerId - Max temporal layer id
     */
    setMaximumLayers(maxSpatialLayerId: number, maxTemporalLayerId: number):
        void;

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transponder}
     */
    on(event: 'stopped',
       listener: (transponder: Transponder) => any): Transponder;
    on(event: 'muted', listener: (muted: boolean) => any): Transponder;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transponder}
     */
    once(event: 'stopped', listener: (transponder: Transponder) => any):
        Transponder;
    once(event: 'muted', listener: (muted: boolean) => any): Transponder;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transponder}
     */
    off(event: 'stopped',
        listener: (transponder: Transponder) => any): Transponder;
    off(event: 'muted', listener: (muted: boolean) => any): Transponder;

    /**
     * Stop this transponder, will dettach the OutgoingStreamTrack
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
     * Enable or disable ultra debug level traces
     * @memberof MediaServer
     * @param {Boolean} flag
     */
    enableUltraDebug(flag: boolean): void;

    /**
     * Create a new endpoint object
     * @memberof MediaServer
     * @param {String} ip	- External IP address of server, to be used when
     *     announcing the local ICE candidate
     * @returns {Endpoint} The new created endpoing
     */
    createEndpoint(ip: string): Endpoint;

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
  }

  export interface IncomingStream {
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
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    on(event: 'track',
       listener: (track: IncomingStreamTrack) => any): IncomingStream;
    on(event: 'stopped',
       listener:
           (stream: IncomingStream, stats: IncomingStreamStatsReport) => any):
        IncomingStream;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'track', listener: (track: IncomingStreamTrack) => any):
        IncomingStream;
    once(
        event: 'stopped',
        listener:
            (stream: IncomingStream, stats: IncomingStreamStatsReport) => any):
        IncomingStream;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    off(event: 'track',
        listener: (track: IncomingStreamTrack) => any): IncomingStream;
    off(event: 'stopped',
        listener:
            (stream: IncomingStream, stats: IncomingStreamStatsReport) => any):
        IncomingStream;

    /**
     * Get statistics for all tracks in the stream
     *
     * See OutgoingStreamTrack.getStats for information about the stats returned
     * by each track.
     *
     * @returns {Map<String>,Object} Map with stats by trackId
     */
    getStats(): IncomingStreamStatsReport;

    /**
     * Get track by id
     * @param {String} trackId	- The track id
     * @returns {IncomingStreamTrack}	- requested track or null
     */
    getTrack(trackId: string): IncomingStreamTrack;

    /**
     * Get all the tracks
     * @param {String} type	- The media type (Optional)
     * @returns {Array<IncomingStreamTrack>}	- Array of tracks
     */
    getTracks(type: string): IncomingStreamTrack[];

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

    /*
     * Adds an incoming stream track created using the
     * Transpocnder.createIncomingStreamTrack to this stream
     *
     * @param {IncomingStreamTrack} track
     */
    addTrack(track: IncomingStreamTrack): void;

    /**
     * Create new track from a TrackInfo object and add it to this stream
     *
     * @param {TrackInfo} trackInfo  Track info object
     * @returns {IncomingStreamTrack}
     */
    createTrack(trackInfo: SemanticSDP.TrackInfo): IncomingStreamTrack;

    /**
     * Removes the media strem from the transport and also detaches from any
     * attached incoming stream
     */
    stop(): void;
  }

  export interface IncomingStreamTrack {
    /**
     * Get stats for all encodings
     * @returns {Map<String,Object>} Map with stats by encodingId
     */
    getStats(): IncomingStreamTrackStatsReport;

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
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStreamTrack}
     */
    on(event: 'attached',
       listener: (track: IncomingStreamTrack) => any): IncomingStream;
    on(event: 'detached',
       listener: (track: IncomingStreamTrack) => any): IncomingStream;
    on(event: 'stopped',
       listener: (track: IncomingStreamTrack) => any): IncomingStream;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'attached', listener: (track: IncomingStreamTrack) => any):
        IncomingStream;
    once(event: 'detached', listener: (track: IncomingStreamTrack) => any):
        IncomingStream;
    once(event: 'stopped', listener: (track: IncomingStreamTrack) => any):
        IncomingStream;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStreamTrack}
     */
    off(event: 'attached',
        listener: (track: IncomingStreamTrack) => any): IncomingStream;
    off(event: 'detached',
        listener: (track: IncomingStreamTrack) => any): IncomingStream;
    off(event: 'stopped',
        listener: (track: IncomingStreamTrack) => any): IncomingStream;

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

  export interface PeerConnectionServer {
    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listeener	- Event listener
     * @returns {PeerConnectionServer}
     */
    on(event: 'stopped',
       listener: (server: PeerConnectionServer) => any): PeerConnectionServer;
    on(event: 'transport',
       listener: (transport: Transport) => any): PeerConnectionServer;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {PeerConnectionServer}
     */
    once(event: 'stopped', listener: (server: PeerConnectionServer) => any):
        PeerConnectionServer;
    once(event: 'transport', listener: (transport: Transport) => any):
        PeerConnectionServer;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {PeerConnectionServer}
     */
    off(event: 'stopped',
        listener: (server: PeerConnectionServer) => any): PeerConnectionServer;
    off(event: 'transport',
        listener: (transport: Transport) => any): PeerConnectionServer;

    /**
     * Stop the peerconnection server, will not stop the transport created by it
     */
    stop(): void;
  }

  export interface OutgoingStreamTrack {
    /**
     * Get track id as signaled on the SDP
     */
    getId(): string;

    /**
     * Get track media type
     * @returns {String} "audio"|"video"
     */
    getMedia(): SemanticSDP.MediaType;

    /**
     * Get track info object
     * @returns {TrackInfo} Track info
     */
    getTrackInfo(): SemanticSDP.TrackInfo;

    /**
     * Get stats for all encodings
     * @returns {Map<String,Object>} Map with stats by encodingId
     */
    getStats(): OutgoingStreamStatsReport;

    /**
     * Return ssrcs associated to this track
     * @returns {Object}
     */
    getSSRCs(): SSRCs;

    /**
     * Check if the track is muted or not
     * @returns {boolean} muted
     */
    isMuted(): boolean;

    /*
     * Mute/Unmute track
     * This operation will not change the muted state of the stream this track
     * belongs too.
     * @param {boolean} muting - if we want to mute or unmute
     */
    mute(muting: boolean): void;

    /**
     * Listen media from the incoming stream track and send it to the remote
     * peer of the associated transport. This will stop any previous transpoder
     * created by a previous attach.
     * @param {IncomingStreamTrack} incomingStreamTrack - The incoming stream to
     *     listen media for
     * @returns {Transponder} Track transponder object
     */
    attachTo(incomingStreamTrack: IncomingStreamTrack): Transponder;

    /**
     * Get attached transpoder for this track
     * @returns {Transponder} Attached transpoder or null if not attached
     */
    getTransponder(): Transponder;

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStreamTrack}
     */
    on(event: 'stopped',
       listener: (track: OutgoingStreamTrack) => any): OutgoingStreamTrack;
    on(event: 'remb',
       listener: (bitrate: number, track: OutgoingStreamTrack) => any):
        OutgoingStreamTrack;
    on(event: 'muted', listener: (muted: boolean) => any): OutgoingStreamTrack;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'stopped', listener: (track: OutgoingStreamTrack) => any):
        OutgoingStreamTrack;
    once(
        event: 'remb',
        listener: (bitrate: number, track: OutgoingStreamTrack) => any):
        OutgoingStreamTrack;
    once(event: 'muted', listener: (muted: boolean) => any):
        OutgoingStreamTrack;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStreamTrack}
     */
    off(event: 'stopped',
        listener: (track: OutgoingStreamTrack) => any): OutgoingStreamTrack;
    off(event: 'remb',
        listener: (bitrate: number, track: OutgoingStreamTrack) => any):
        OutgoingStreamTrack;
    off(event: 'muted', listener: (muted: boolean) => any): OutgoingStreamTrack;

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
     * @returns {Array<RecorderTrack>}
     */
    record(incomingStreamOrTrack: IncomingStream|
           IncomingStreamTrack): RecorderTrack[];

    /**
     * Stop recording and close file. NOTE: File will be flsuh async,
     * @returns {undefined} -  TODO: return promise when flush is ended
     */
    stop(): void;
  }

  export interface RecorderTrack {
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
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {RecorderTrack}
     */
    on(event: 'stopped',
       listener: (track: RecorderTrack) => any): RecorderTrack;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'stopped', listener: (track: RecorderTrack) => any):
        RecorderTrack;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {RecorderTrack}
     */
    off(event: 'stopped',
        listener: (track: RecorderTrack) => any): RecorderTrack;

    /**
     * Stop recording this track
     */
    stop(): void;
  }

  export interface Player {
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

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    on(event: 'stopped', listener: (track: Player) => any): Player;
    on(event: 'ended', listener: (track: Player) => any): Player;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'stopped', listener: (track: Player) => any): Player;
    once(event: 'ended', listener: (track: Player) => any): Player;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    off(event: 'stopped', listener: (track: Player) => any): Player;
    off(event: 'ended', listener: (track: Player) => any): Player;
  }

  export interface EmulatedTransport {
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

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listeener	- Event listener
     * @returns {Transport}
     */
    on(event: 'stopped',
       listener: (track: EmulatedTransport) => any): EmulatedTransport;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'stopped', listener: (track: EmulatedTransport) => any):
        EmulatedTransport;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transport}
     */
    off(event: 'stopped',
        listener: (track: EmulatedTransport) => any): EmulatedTransport;
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

  /**
   * Represent the connection between a local udp port and a remote one. It
   * sends and/or receive plain RTP data.
   */
  export interface StreamerSession {
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

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {StreamerSession}
     */
    on(event: 'stopped',
       listener: (s: StreamerSession) => any): StreamerSession;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'stopped', listener: (s: StreamerSession) => any):
        StreamerSession;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {StreamerSession}
     */
    off(event: 'stopped',
        listener: (s: StreamerSession) => any): StreamerSession;
  }

  /**
   * Periodically request an I frame on all incoming stream or tracks
   */
  export interface Refresher {
    /**
     * Add stream or track to request
     * @param {IncomintgStream|IncomingStreamTrack} streamOrTrack
     */
    add(streamOrTrack: IncomingStream|IncomingStreamTrack): void;

    /**
     * Stop refresher
     */
    stop(): void;

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    on(event: 'stopped', listener: (r: Refresher) => any): Refresher;
    on(event: 'refreshing', listener: (r: Refresher) => any): Refresher;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'stopped', listener: (r: Refresher) => any): Refresher;
    once(event: 'refreshing', listener: (r: Refresher) => any): Refresher;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {OutgoingStream}
     */
    off(event: 'stopped', listener: (r: Refresher) => any): Refresher;
    off(event: 'refreshing', listener: (r: Refresher) => any): Refresher;
  }

  export interface SDPManager {
    /**
     * Get current SDP offer/answer state
     * @returns {String} one of
     *     "initial","local-offer","remote-offer","stabable".
     */
    getState(): 'initial'|'local-offer'|'remote-offer'|'stable';

    /**
     * Returns the Transport object created by the SDP O/A
     * @returns {Transport}
     */
    getTransport(): Transport;

    /*
     * Create local description
     * @return {String}
     */
    createLocalDescription(): string;

    /**
     * Process remote offer
     */
    processRemoteDescription(sdp: string): void;

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listeener	- Event listener
     * @returns {Transport}
     */
    on(event: 'renegotiationneeded',
       listener: (transport: Transport) => any): SDPManager;
    on(event: 'transport', listener: (transport: Transport) => any): SDPManager;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(event: 'renegotiationneeded', listener: (transport: Transport) => any):
        SDPManager;
    once(event: 'transport', listener: (transport: Transport) => any):
        SDPManager;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {Transport}
     */
    off(event: 'renegotiationneeded',
        listener: (transport: Transport) => any): SDPManager;
    off(event: 'transport',
        listener: (transport: Transport) => any): SDPManager;
  }

  export interface ActiveSpeakerDetector {
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
     * Stop this transponder, will dettach the OutgoingStreamTrack
     */
    stop(): void;

    /**
     * Add event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStreamTrack}
     */
    on(event: 'activespeakerchanged',
       listener: (track: IncomingStreamTrack) => any): ActiveSpeakerDetector;
    on(event: 'stopped', listener: () => any): ActiveSpeakerDetector;

    /**
     * Add event listener once
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStream}
     */
    once(
        event: 'activespeakerchanged',
        listener: (track: IncomingStreamTrack) => any): ActiveSpeakerDetector;
    once(event: 'stopped', listener: () => any): ActiveSpeakerDetector;

    /**
     * Remove event listener
     * @param {String} event	- Event name
     * @param {function} listener	- Event listener
     * @returns {IncomingStreamTrack}
     */
    off(event: 'activespeakerchanged',
        listener: (track: IncomingStreamTrack) => any): ActiveSpeakerDetector;
    off(event: 'stopped', listener: () => any): ActiveSpeakerDetector;
  }

  let MediaServer: MediaServer;
  export default MediaServer;
}
