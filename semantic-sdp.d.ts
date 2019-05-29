declare module 'semantic-sdp' {
  export type MediaType = 'audio'|'video';

  export interface SDPInfoParams {
    // ICE info object
    ice?: ICEInfo;
    // DTLS info object
    dtls?: DTLSInfo;
    // Array of Ice candidates
    candidates?: CandidateInfo[];
    // Capabilities for each media type
    capabilities?: {[k: string]: SupportedMedia};
  }

  export interface RTCPFeedbackInfoPlain {
    id: string;
    params?: string[];
  }

  export interface SupportedMedia {
    // List of strings with the supported codec names
    codecs: {[id: string]: CodecInfo}|string[];
    // List of strings with the supported codec names
    extensions: string[];
    // Simulcast is enabled
    simulcast?: boolean;
    // Supported RTCP feedback params
    rtcpfbs: RTCPFeedbackInfoPlain[];
    // If rtx is supported for codecs (only needed if passing codec names
    // instead of CodecInfo)
    rtx?: boolean;
  }

  export type DirectionPlain =|'sendrecv'|'sendonly'|'recvonly'|'inactive';

  export interface CodecInfoPlain {
    codec: string;
    type: string;
    rtx?: number;
    params?: {[k: string]: string};
    rtcpfbs: RTCPFeedbackInfoPlain[];
  }
  export interface StreamInfoPlain {
    id: string;
    tracks: TrackInfoPlain[];
  }
  export interface RIDInfoPlain {
    id: string;
    direction: DirectionPlain;
    formats: number[];
    params: {[k: string]: string};
  }
  export interface SimulcastInfoPlain {
    send: SimulcastStreamInfo[][];
    recv: SimulcastStreamInfo[][];
  }
  export interface MediaInfoPlain {
    id: string;
    type: MediaType;
    direction: DirectionPlain;
    bitrate?: number;
    codecs: CodecInfoPlain[];
    extensions?: {[extID: number]: string};
    rids?: RIDInfoPlain[];
    simulcast?: SimulcastInfoPlain;
  }
  export interface CandidateInfoPlain {
    foundation: string;
    componentId: number;
    transport: string;
    priority: number;
    address: string;
    port: number;
    type: string;
    relAddr?: string;
    relPort?: string;
  }
  export interface SourceGroupInfoPlain {
    semantics: string;
    ssrcs: number[];
  }
  export interface ICEInfoPlain {
    ufrag: string;
    pwd: string;
    lite?: boolean;
    endOfCandidates?: boolean;
  }
  export interface DTLSInfoPlain {
    setup: string;
    hash: string;
    fingerprint: string;
  }
  export interface TrackEncodingInfoPlain {
    id: string;
    paused: boolean;
    codecs: {[id: string]: CodecInfo};
    params: {[k: string]: string};
  }
  export interface TrackInfoPlain {
    id: string;
    media: MediaType;
    mediaId?: string;
    ssrcs: number[];
    groups?: SourceGroupInfoPlain[];
    encodings?: TrackEncodingInfoPlain[];
  }
  export interface SDPInfoPlain {
    version: number;
    streams: StreamInfoPlain[];
    medias: MediaInfoPlain[];
    candidates: CandidateInfoPlain[];
    ice?: ICEInfoPlain;
    dtls?: DTLSInfoPlain;
  }

  export interface SimulcastStreamInfoPlain {
    id: string;
    paused: boolean;
  }

  /**
   * SDP semantic info object
   *	This object represent the minimal information of an WebRTC SDP in a
   *semantic hierarchy
   * @namespace
   */
  export class SDPInfo {
    /**
     * Process an SDP string and convert it to a semantic SDP info
     * @deprecated Use SDPInfo.parse instead
     * @param {String} string SDP
     * @returns {SDPInfo} Parsed SDP info
     */
    static process(str: string): SDPInfo;

    /**
     * Parses an SDP string and convert it to a semantic SDP info
     * @param {String} string SDP
     * @returns {SDPInfo} Parsed SDP info
     */
    static parse(str: string): SDPInfo;

    /**
     * Expands a plain JSON object containing an SDP INFO
     * @param {Object} plain JSON object
     * @returns {SDPInfo} Parsed SDP info
     */
    static expand(plain: Object): SDPInfo;

    /**
     * Create sdp based on the following info
     * @param {Object} params		- Parameters to create ansser
     * @param {ICEInfo|Object} params.ice		- ICE info object
     * @param {DTLSInfo|Object} params.dtls	- DTLS info object
     * @params{Array<CandidateInfo> params.candidates - Array of Ice candidates
     * @param {Map<String,DTLSInfo} params.capabilites - Capabilities for each
     *     media type
     * @returns {SDPInfo} answer
     */
    static create(params: SDPInfoParams): SDPInfo;

    /**
     * Clone SDPinfo object
     * @returns {SDPInfo} cloned object
     */
    clone(): SDPInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): SDPInfoPlain;

    /**
     * Returns an unified plan version of the SDP info
     * @returns {SDPInfo} Unified version
     */
    unify(): SDPInfo;

    /**
     * Set SDP version
     * @param {Number} version
     */
    setVersion(version: number): void;

    /**
     * Add a new media description information to this sdp info
     * @param {MediaInfo} media
     */
    addMedia(media: MediaInfo): void;

    /**
     * Get first media description info associated to the media type
     * @param {String} type - Media type ('audio'|'video')
     * @returns {MediaInfo} or null if not found
     */
    getMedia(type: MediaType): MediaInfo;

    /**
     * Get all media description info associated to the media type
     * @param {String} type - Media type ('audio'|'video')
     * @returns {Array<MediaInfo>} or null if not found
     */
    getMediasByType(type: MediaType): MediaInfo[];

    /**
     * Get media description info associated by media Ide
     * @param {String} msid - Media type ('audio'|'video')
     * @returns {MediaInfo} or null if not found
     */
    getMediaById(msid: string): MediaInfo;

    /**
     * Replace media with same id with the new one
     * @param {MediaInfo} media - The new media
     * @returns {boolean} true if the media was replaced, false if not found
     */
    replaceMedia(media: MediaInfo): boolean;

    /**
     * Return all media description information
     * @returns {Array<MediaInfo>}
     */
    getMedias(): MediaInfo[];

    /**
     * Return SDP version attribute
     * @returns {Number}
     */
    getVersion(): number;

    /**
     * Get DTLS info for the transport bundle
     * @returns {DTLSInfo} DTLS info object
     */
    getDTLS(): DTLSInfo;

    /**
     * Set DTLS info object for the transport bundle
     * @param {DTLSInfo}  dtlsInfo - DTLS info object
     */
    setDTLS(dtlsInfo: DTLSInfo): void;

    /**
     * Get the ICE info object for the transport bundle
     * @returns {ICEInfo} ICE info object
     */
    getICE(): ICEInfo;

    /**
     * Set ICE info object for the transport bundle
     * @param {ICEInfo} iceInfo - ICE info object
     */
    setICE(iceInfo: ICEInfo): void;

    /**
     * Add ICE candidate for transport
     * @param {CandidateInfo} candidate - ICE candidate
     */
    addCandidate(candidate: CandidateInfo): void;

    /**
     * Add ICE candidates for transport
     * @param {Array<{CandidateInfo>} candidates - ICE candidates
     */
    addCandidates(candidates: CandidateInfo[]): void;

    /**
     * Get all ICE candidates for this transport
     * @returns {Array<CandidateInfo>}
     */
    getCandidates(): CandidateInfo[];

    /**
     * Get announced stream
     * @param {String} id
     * @returns {StreamInfo}
     */
    getStream(id: string): StreamInfo;

    /**
     * Get all announced stream
     * @returns {Array<StreamInfo>}
     */
    getStreams(): StreamInfo[];

    /**
     * Get first announced stream
     * @returns {StreamInfo}
     */
    getFirstStream(): StreamInfo|null;

    /**
     * Announce a new stream in SDP
     * @param {StreamInfo} stream
     */
    addStream(stream: StreamInfo): void;

    /**
     * Remove an announced stream from SDP
     * @param {StreamInfo} stream
     * @returns {boolean}
     */
    removeStream(stream: StreamInfo): boolean;

    /**
     * Remove all streams
     */
    removeAllStreams(): void;

    /**
     *
     * @param {String} mid Media Id
     * @returns {TrackInfo} Track info
     */
    getTrackByMediaId(mid: string): TrackInfo;

    /**
     *
     * @param {String} mid Media Id
     * @returns {StreamInfo} Streaminfo
     */
    getStreamByMediaId(mid: string): StreamInfo;

    /**
     * Create answer to this SDP
     * @param {Object} params		- Parameters to create ansser
     * @param {ICEInfo} params.ice		- ICE info object
     * @param {DTLSInfo} params.dtls	- DTLS info object
     * @params{Array<CandidateInfo> params.candidates - Array of Ice candidates
     * @param {Map<String,DTLSInfo} params.capabilites - Capabilities for each
     *     media type
     * @returns {SDPInfo} answer
     */
    answer(params: SDPInfoParams): SDPInfo;

    /**
     * Convert to an SDP string
     * @returns {String}
     */
    toString(): string;
  }

  /**
   * ICE candidate information
   * @namespace
   */
  export class CandidateInfo {
    /**
     * Expands a plain JSON object containing an CandidateInfo
     * @param {Object} plain JSON object
     * @returns {CandidateInfo} Parsed Candidate info
     */
    static expand(plain: CandidateInfoPlain): CandidateInfo;

    constructor(
        foundation: string, componentId: number, transport: string,
        priority: number, address: string, port: number, type: string,
        relAddr: string, relPort: number);

    /**
     * Check if the ice candadate has same info as us
     * @param {CandidateInfo} candidate - ICE candadate to check against
     * @returns {Boolean}
     */
    equals(candidate: CandidateInfo): boolean;

    /**
     * Create a clone of this Candidate info object
     * @returns {CandidateInfo}
     */
    clone(): CandidateInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): CandidateInfoPlain;

    /**
     * Get the candidate foundation
     * @returns {String}
     */
    getFoundation(): string;

    /**
     * Get the candidate component id
     * @returns {Number}
     */
    getComponentId(): number;

    /**
     * Get the candidate transport type
     * @returns {String}
     */
    getTransport(): string;

    /**
     * Get the candidate priority
     * @returns {Number}
     */
    getPriority(): number;

    /**
     * Get the candidate IP address
     * @returns {String}
     */
    getAddress(): string;

    /**
     * Get the candidate IP port
     * @returns {Number}
     */
    getPort(): number;

    /**
     * Get the candidate type
     * @returns {String}
     */
    getType(): string;

    /**
     * Get the candidate related IP address for relfexive candidates
     * @returns {String}
     */
    getRelAddr(): string;

    /**
     * Get the candidate related IP port for relfexive candidates
     * @returns {Number}
     */
    getRelPort(): number;
  }

  /**
   * Media information (relates to a m-line in SDP)
   * @namespace
   */
  export class MediaInfo {
    /**
     * Clone MediaInfo object
     * @returns {MediaInfo} cloned object
     */
    clone(): MediaInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): MediaInfoPlain;

    /**
     * Get media type "audio"|"video"
     * @returns {String}
     */
    getType(): MediaType;

    /**
     * Get id (msid) for the media info
     * @returns {String}
     */
    getId(): string;

    /**
     * Set id (msid) for the media info
     * @param {String} id
     */
    setId(id: string): void;

    /**
     * Add rtp header extension support
     * @param {Number} id
     * @param {String} name
     */
    addExtension(id: number, name: string): void;

    /**
     * Add rid information
     * @param {RIDInfo} ridInfo
     */
    addRID(ridInfo: RIDInfo): void;

    /**
     * Add Codec support information
     * @param {CodecInfo} codecInfo - Codec info object
     */
    addCodec(codecInfo: CodecInfo): void;

    /**
     * Set codec map
     * @param {Map<Number,CodecInfo> codecs - Map of codec info objecs
     */
    setCodecs(codecs: {[id: number]: CodecInfo}): void;

    /**
     * Get codec for payload type number
     * @param {Number} type - Payload type number
     * @returns {CodecInfo} codec info object
     */
    getCodecForType(type: number): CodecInfo;

    /**
     * Get codec by codec name
     * @param {String} codec - Codec name (eg: "vp8")
     * @returns {CodecInfo}
     */
    getCodec(codec: string): CodecInfo;

    /**
     * Check if this media has information for this codec
     * @param {String} codec - Codec name
     * @returns {Boolean}
     */
    hasCodec(codec: string): boolean;

    /**
     * Get all codecs in this media
     * @returns {Map<Number,CodecInfo>}
     */
    getCodecs(): {[id: number]: CodecInfo};

    /**
     * Check if any of the codecs on the media description supports rtx
     * @returns {Boolean}
     */
    hasRTX(): boolean;

    /**
     * Get all extensions registered in  this media info
     * @returns {Map<Number,String>}
     */
    getExtensions(): {[id: number]: string};

    /**
     * Get all rids registered in  this media info
     * @returns {Map<String,RIDInfo>}
     */
    getRIDs(): {[id: string]: RIDInfo};

    /**
     * Get rid info for id
     * @param {String} id - rid value to get info for
     * @returns {RIDInfo}
     */
    getRID(id: string): RIDInfo;

    /**
     * Returns maximum bitrate for this media
     * @returns {Number}
     */
    getBitrate(): number;

    /**
     * Set maximum bitrate for this media
     * @param {Number} bitrate
     */
    setBitrate(bitrate: number): void;

    /**
     * Get media direction
     * @returns {Direction}
     */
    getDirection(): Direction;

    /**
     * Set media direction
     * @param {Direction} direction
     */
    setDirection(direction: Direction): void;

    /**
     * Helper usefull for creating media info answers.
     * - Will reverse the direction
     * - For each supported codec, it will change the payload type to match the
     * offer and append it to the answer
     * - For each supported extension, it will append the ones present on the
     * offer with the id offered
     * @param {Object} supported - Supported codecs and extensions to be
     *     included on answer
     * @param {Map<String,CodecInfo>} supported.codecs - List of strings with
     *     the supported codec names
     * @param {Set<String>} supported.extensions - List of strings with the
     *     supported codec names
     * @param {Boolean] supported.simulcast - Simulcast is enabled
     * @param {Array<String>} supported.rtcpfbs - Supported RTCP feedback params
     * @return {MediaInfo}
     */
    answer(supported: SupportedMedia|null): MediaInfo;

    /**
     * Get Simulcast info
     * @returns {SimulcastInfo}
     */
    getSimulcast(): SimulcastInfo;

    /**
     * Set stream simulcast info
     * @param {SimulcastInfo} simulcast - Simulcast stream info
     */
    setSimulcast(simulcast: SimulcastInfo): void;

    /**
     * Helper factory for creating media info objects.
     * @param {String} - Media type
     * @param {Object} supported - Supported media capabilities to be included
     *     on media info
     * @param {Map<String,CodecInfo> | Array<String>} supported.codecs - Map or
     *     codecInfo or list of strings with the supported codec names
     * @param {boolean] rtx - If rtx is supported for codecs (only needed if
     *     passing codec names instead of CodecInfo)
     * @param {Object] rtcpbfs
     * @param {Array<String>} supported.extensions - List of strings with the
     *     supported codec names
     * @return {MediaInfo}
     */
    static create(type: MediaType, supported: SupportedMedia|null): MediaInfo;

    /**
     * Expands a plain JSON object containing an MediaInfo
     * @param {Object} plain JSON object
     * @returns {MediaInfo} Parsed Media info
     */
    static expand(plain: MediaInfoPlain): MediaInfo;
  }

  /**
   * Media Stream information
   * @namespace
   */
  export class StreamInfo {
    /**
     * Create a clone of this stream info object
     * @returns {StreamInfo}
     */
    clone(): StreamInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): StreamInfoPlain;

    /**
     * Get the media stream id
     * @returns {String}
     */
    getId(): string;

    /**
     * Add media track
     * @param {TrackInfo} track
     */
    addTrack(track: TrackInfo): void;

    /*
     * Remove a media track from stream
     * @param {TrackInfo} trackInfo - Info object from the track
     * @returns {TrackInfo} if the track was present on track map or not
     */
    removeTrack(track: TrackInfo): TrackInfo;

    /*
     * Remove a media track from stream
     * @param {Sring} trackId - Id of the track to remote
     * @returns {TrackInfo} if the track was present on track map or not
     */
    removeTrackById(trackId: string): TrackInfo;

    /**
     * Get firs track for the media type
     * @param {String} media - Media type "audio"|"video"
     * @returns {TrackInfo}
     */
    getFirstTrack(media: MediaType): TrackInfo|null;

    /**
     * Get all tracks from the media stream
     * @returns {Map.TrackInfo}
     */
    getTracks(): {[trackID: string]: TrackInfo};

    /**
     * Remove all tracks from media sream
     */
    removeAllTracks(): void;

    /**
     * Get track by id
     * @param {String} trackId
     * @returns {TrackInfo}
     */
    getTrack(trackId: string): TrackInfo;

    /**
     * Expands a plain JSON object containing an StreamInfo
     * @param {Object} plain JSON object
     * @returns {StreamInfo} Parsed Stream info
     */
    static expand(plain: TrackInfoPlain): TrackInfo;
  }

  /**
   * Media Track information
   * @namespace
   */
  export class TrackInfo {
    /**
     * Create a clone of this track info object
     * @returns {TrackInfo}
     */
    clone(): void;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): TrackInfoPlain;

    /**
     * Get media type
     * @returns {String} - "audio"|"video"
     */
    getMedia(): MediaType;

    /**
     * Set the media line id this track belongs to. Set to null for first media
     * line of the media type
     * @param {String} mediaId		- MediaInfo id
     */
    setMediaId(mediaId: string): void;

    /**
     * Returns the MediaInfo id this track belongs two (unified) or undefined if
     * indiferent (plan B)
     * @returns {String}
     */
    getMediaId(): string;

    /**
     * Get track id
     * @returns {String}
     */
    getId(): string;

    /**
     * Add ssrc for this track
     * @param {Number} ssrc
     */
    addSSRC(ssrc: number): void;

    /**
     * Get all
     * @returns {Array}
     */
    getSSRCs(): number[];

    /**
     * Add source group to track
     * @param {SourceGroupInfo} group
     */
    addSourceGroup(group: SourceGroupInfo): void;

    /**
     * Get the source group fot the desired type
     * @param {String} schematics - Group type
     * @returns {SourceGroupInfo}
     */
    getSourceGroup(schematics: string): SourceGroupInfo;

    /**
     * Get all source groups for this track
     * @returns {Array<SourceGroupInfo>}
     */
    getSourceGroups(): SourceGroupInfo[];

    /**
     * Check if track has a group for this type
     * @param {String} schematics
     * @returns {Boolean}
     */
    hasSourceGroup(schematics: string): boolean;

    /**
     * Get simulcast encoding information for this track (if any)
     * @returns {Array<Array<TrackEncodingInfo>>}
     */
    getEncodings(): TrackEncodingInfo[][];

    /**
     * Add simulcast encoding information for this track
     * @param {TrackEncodingInfo} encoding - Simulcast encoding info
     */
    addEncoding(encoding: TrackEncodingInfo): void;

    /**
     * Add simulcast encoding information for this track
     * @param {Array<TrackEncodingInfo>} alternatives - Simulcast encoding info
     */
    addAlternativeEncodings(alternatives: TrackEncodingInfo[]): void;

    /**
     * Add simulcast encoding information for this track
     * @param {Array<Array<TrackEncodingInfo>>} encodings - Simulcast encoding
     *     info
     */
    setEncodings(encodings: TrackEncodingInfo[][]): void;

    /**
     * Expands a plain JSON object containing an TrackInfo
     * @param {Object} plain JSON object
     * @returns {TrackInfo} Parsed Track info
     */
    static expand(plain: TrackInfoPlain): TrackInfo;
  }

  /**
   * Enum for Setup values.
   * @readonly
   * @enum {number}
   */
  export class Setup {
    /**
     * Get Setup by name
     * @memberOf Setup
     * @param {string} setup
     * @returns {Setup}
     */
    static byValue(setup: string): Setup;

    /**
     * Get Setup name
     * @memberOf Setup
     * @param {Setup} setup
     * @returns {String}
     */
    static toString(setup: Setup): string;

    /**
     * Get reverse Setup
     * @memberOf Setup
     * @param {Setup} setup
     * @returns {Setup}
     */
    static reverse(setup: Setup): Setup;
  }

  /**
   * Enum for Direction values.
   * @readonly
   * @enum {number}
   */
  export class Direction {
    /**
     * Get Direction by name
     * @memberOf Direction
     * @param {string} direction
     * @returns {Direction}
     */
    static byValue(direction: DirectionPlain): Direction;

    /**
     * Get Direction name
     * @memberOf Direction
     * @param {Direction} direction
     * @returns {String}
     */
    static toString(direction: Direction): DirectionPlain;

    /**
     * Get reverse direction
     * @memberOf Direction
     * @param {Direction} direction
     * @returns {Direction} Reversed direction
     */
    static reverse(direction: Direction): Direction;
  }

  /**
   * Enum for DirectionWay Way values.
   * @readonly
   * @enum {number}
   */
  export class DirectionWay {
    /**
     * Get Direction Way by name
     * @memberOf DirectionWay
     * @param {string} direction
     * @returns {DirectionWay}
     */
    static byValue(direction: string): DirectionWay;

    /**
     * Get Direction Way name
     * @memberOf DirectionWay
     * @param {DirectionWay} direction
     * @returns {String}
     */
    static toString(direction: DirectionWay): string;

    /**
     * Get reverse direction way
     * @memberOf DirectionWay
     * @param {DirectionWay} direction
     * @returns {DirectionWay} Reversed direction
     */
    static reverse(direction: DirectionWay): DirectionWay;
  }

  /**
   * Codec information extracted for RTP payloads
   * @namespace
   */
  export class CodecInfo {
    /**
     * Create a clone of this Codec info object
     * @returns {CodecInfo}
     */
    clone(): CodecInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): CodecInfoPlain;

    /**
     * Set the RTX payload type number for this codec
     * @param {Number} rtx
     */
    setRTX(rtx: number): void;

    /**
     * Get payload type for codec
     * @returns {Number}
     */
    getType(): number;

    /**
     * Get payload type for codec
     * @returns {Number}
     */
    getType(): number;

    /**
     * Set the payload type for codec
     * @params {Number} type
     */
    setType(type: number): void;

    /**
     * Get codec name
     * @returns {String}
     */
    getCodec(): string;

    /**
     * Get codec format parameters
     */
    getParams(): {[key: string]: string};

    /*
     * Add codec info params
     * @returns {Object} params
     */
    addParams(params: {[key: string]: string}): void;

    /**
     * Add codec info param
     * @param {String} key
     * @param {String} value
     */
    addParam(key: string, value: string): void;

    /**
     * Check if codec has requested param
     * @param {String} key
     * @returns {Boolean}
     */
    hasParam(key: string): boolean;

    /**
     * Get param
     * @param {String} key
     * @param {String} defaultValue default value if param is not found
     * @returns {Boolean}
     */
    getParam(key: string, defaultValue?: string): string;

    /**
     * Check if this codec has an associated RTX payload type
     * @returns {Number}
     */
    hasRTX(): boolean;

    /**
     * Get the associated RTX payload type for this codec
     * @returns {Number}
     */
    getRTX(): number;

    /**
     * Add an RTCP feedback parameter to this codec type
     * @params {RTCPFeedbackInfo} rtcpfb - RTCP feedback info objetc
     */
    addRTCPFeedback(rtcpfb: RTCPFeedbackInfo): void;

    /**
     * Get all extensions rtcp feedback parameters in this codec info
     * @returns {Set<RTCPFeedbackInfo>}
     */
    getRTCPFeedbacks(): Set<RTCPFeedbackInfo>;

    /**
     * Expands a plain JSON object containing an CodecInfo
     * @param {Object} plain JSON object
     * @returns {CodecInfo} Parsed Codec info
     */
    static expand(plain: CodecInfoPlain): CodecInfo;

    /**
     * Create a map of CodecInfo from codec names.
     * Payload type is assigned dinamically
     * @param {Array<String>} names
     * @return Map<String,CodecInfo>
     * @params {Boolean} rtx - Should we add rtx?
     * @param {Array<String>} params - RTCP feedback params
     */
    static MapFromNames(names: string[], rtx: boolean, rtcpfbs: string[]):
        Map<string, CodecInfo>;
  }

  /**
   * RTCP Feedback parameter
   * @namespace
   */
  export class RTCPFeedbackInfo {
    /**
     * Create a clone of this RTCPFeedbackParameter info object
     * @returns {RTCPFeedbackInfo}
     */
    clone(): RTCPFeedbackInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): RTCPFeedbackInfoPlain;

    /**
     * Get id fo the rtcp feedback parameter
     * @returns {String}
     */
    getId(): string;

    /**
     * Get codec  rtcp feedback parameters
     * @returns {Array<String>} parameters
     */
    getParams(): string[];

    /**
     * Expands a plain JSON object containing an CodecInfo
     * @param {Object} plain JSON object
     * @returns {CodecInfo} Parsed Codec info
     */
    static expand(plain: RTCPFeedbackInfoPlain): RTCPFeedbackInfo;
  }

  /**
   * DTLS peer info
   * @namespace
   */
  export class DTLSInfo {
    /**
     * Create a clone of this DTLS info object
     * @returns {DTLSInfo}
     */
    clone(): DTLSInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): DTLSInfoPlain;

    /**
     * Get peer fingerprint
     * @returns {String}
     */
    getFingerprint(): string;

    /**
     * Get hash function name
     * @returns {String}
     */
    getHash(): string;

    /**
     * Get connection setup
     * @returns {Setup}
     */
    getSetup(): Setup;

    /**
     * Set connection setup
     * @param {Setup} setup
     */
    setSetup(setup: Setup): void;

    /**
     * Expands a plain JSON object containing an DTLSInfo
     * @param {Object} plain JSON object
     * @returns {DTLSInfo} Parsed DTLS info
     */
    static expand(plain: DTLSInfoPlain): DTLSInfo;
  }

  /**
   * ICE information for a peer
   * @namespace
   */
  export class ICEInfo {
    /**
     * Create a clone of this Codec info object
     * @returns {ICEInfo}
     */
    clone(): ICEInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): ICEInfoPlain;

    /**
     * Get username fragment
     * @returns {String} ufrag
     */
    getUfrag(): string;

    /**
     * Get username password
     * @returns {String}	password
     */
    getPwd(): string;

    /**
     * Is peer ICE lite
     * @returns {Boolean}
     */
    isLite(): boolean;

    /**
     * Set peer as ICE lite
     * @param {boolean} lite
     */
    setLite(lite: boolean): void;

    /**
     * Genereate a new peer ICE info with ramdom values
     * @param {Boolean} lite - Set ICE lite flag
     * @returns {ICEInfo}
     */
    static generate(lite: boolean): ICEInfo;

    /**
     * Expands a plain JSON object containing an ICEInfo
     * @param {Object} plain JSON object
     * @returns {ICEInfo} Parsed ICE info
     */
    static expand(plain: ICEInfoPlain): ICEInfo;
  }

  /**
   * RID info
   * @namespace
   */
  export class RIDInfo {
    /**
     * Create a clone of this RID info object
     * @returns {RIDInfo}
     */
    clone(): RIDInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): RIDInfoPlain;

    /**
     * Get the rid id value
     * @returns {String}
     */
    getId(): string;

    /**
     * Get rid direction
     * @returns {DirectionWay}
     */
    getDirection(): DirectionWay;

    /**
     * Set direction setup
     * @param {DirectionWay} direction
     */
    setDirection(direction: DirectionWay): void;

    /**
     * Get pt formats for rid
     * @returns {Array.Number}
     */
    getFormats(): number[];

    /**
     * Set pt formats for rid
     * @param {Array} formats
     */
    setFormats(formats: number[]): void;

    /**
     * Get the rid params
     * @returns {Map<String,String>} The params map
     */
    getParams(): {[key: string]: string};

    /**
     * Set the rid params
     * @param {Map<String,String>} params - rid params map
     */
    setParams(params: {[key: string]: string}): void;

    /**
     * Add an rid param
     * @param {String} id
     * @param {String} param
     */
    addParam(id: string, param: string): void;

    /**
     * Get rid direction
     * @returns {DirectionWay}
     */
    getDirection(): DirectionWay;

    /**
     * Set direction setup
     * @param {DirectionWay} direction
     */
    setDirection(direction: DirectionWay): void;

    /**
     * Expands a plain JSON object containing an RIDInfo
     * @param {Object} plain JSON object
     * @returns {RIDInfo} Parsed RID info
     */
    static expand(plain: RIDInfoPlain): RIDInfo;
  }

  /**
   * Simulcast information
   * @namespace
   */
  export class SimulcastInfo {
    /**
     * Create a clone of this track info object
     * @returns {SimulcastInfo}
     */
    clone(): SimulcastInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): SimulcastInfoPlain;

    /**
     * Add a simulcast alternative streams for the specific direction
     * @param {DirectionWay} direction - Which direction you want the streams
     *     for
     * @param {Array<SimulcastStreamInfo>} streams - Stream info of all the
     *     alternatives
     */
    addSimulcastAlternativeStreams(
        direction: DirectionWay, streams: SimulcastStreamInfo[]): void;

    /**
     * Add a single simulcast stream for the specific direction
     * @param {DirectionWay} direction - Which direction you want the streams
     *     for
     * @param {Array<SimulcastStreamInfo>} stream - Stream info of all the
     *     alternatives
     */
    addSimulcastStream(direction: DirectionWay, stream: SimulcastStreamInfo):
        void;

    /**
     * Get all simulcast streams by direction
     * @param {DirectionWay} direction - Which direction you want the streams
     *     for
     * @returns {Array<Array<SimulcastStreamInfo>>}
     */
    getSimulcastStreams(direction: DirectionWay): SimulcastStreamInfo[][];

    /**
     * Expands a plain JSON object containing an SimulcastInfo
     * @param {Object} plain JSON object
     * @returns {SimulcastInfo} Parsed Simulcast info
     */
    static expand(plain: SimulcastInfoPlain): SimulcastInfo;
  }

  /**
   * Group of SSRCS info
   * @namespace
   */
  export class SourceGroupInfo {
    /**
     * Create a clone of this source group info object
     * @returns {SourceGroupInfo}
     */
    clone(): SourceGroupInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): SourceGroupInfoPlain;

    /**
     * Get group semantics
     * @returns {String}
     */
    getSemantics(): string;

    /**
     * Get list of ssrcs from this group
     * @returns {Array<Number>}
     */
    getSSRCs(): number[];

    /**
     * Expands a plain JSON object containing an SourceGroupInfo
     * @param {Object} plain JSON object
     * @returns {SourceGroupInfo} Parsed SourceGroup info
     */
    static expand(plain: SourceGroupInfoPlain): SourceGroupInfo;
  }

  /**
   * Simulcast encoding layer information for track
   * @namespace
   */
  export class TrackEncodingInfo {
    /**
     * Create a clone of this RID info object
     * @returns {TrackEncodingInfo}
     */
    clone(): TrackEncodingInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): TrackEncodingInfoPlain;

    /**
     * Get the rid id value
     * @returns {String}
     */
    getId(): string;

    /**
     * Get codec information for this encoding (if any)
     * @returns {Map<String,CodecInfo>}
     */
    getCodecs(): {[key: string]: CodecInfo};

    /**
     * Add codec info
     * @param {CodecInfo} codec - Codec Info
     */
    addCodec(codec: CodecInfo): void;

    /**
     * Get the rid params
     * @returns {Map<String,String>} The params map
     */
    getParams(): {[key: string]: string};

    /**
     * Set the rid params
     * @param {Map<String,String>} params - rid params map
     */
    setParams(params: {[key: string]: string}): void;

    /**
     * Add an rid param
     * @param {String} id
     * @param {String} param
     */
    addParam(id: string, param: string): void;

    /**
     * Is the stream paused
     * @returns {Boolean}
     */
    isPaused(): boolean;

    /**
     * Expands a plain JSON object containing an TrackEncodingInfo
     * @param {Object} plain JSON object
     * @returns {TrackEncodingInfo} Parsed TrackEncoding info
     */
    static expand(plain: TrackEncodingInfoPlain): TrackEncodingInfo;
  }

  /**
   * Simulcast streams info
   * @namespace
   */
  export class SimulcastStreamInfo {
    /**
     * Create a clone of this simulcast stream info object
     * @returns {SimulcastStreamInfo}
     */
    clone(): SimulcastStreamInfo;

    /**
     * Return a plain javascript object which can be converted to JSON
     * @returns {Object} Plain javascript object
     */
    plain(): SimulcastStreamInfoPlain;

    /**
     * Is the stream paused
     * @returns {Boolean}
     */
    isPaused(): boolean;

    /**
     * Get rid in this stream
     * @returns {String}
     */
    getId(): string;

    /**
     * Expands a plain JSON object containing an SimulcastStreamInfo
     * @param {Object} plain JSON object
     * @returns {SimulcastStreamInfo} Parsed SimulcastStream info
     */
    static expand(plain: SimulcastStreamInfoPlain): SimulcastStreamInfo;
  }
}
