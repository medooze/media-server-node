const Native		= require("./Native");
const SemanticSDP	= require("semantic-sdp");
const {
	MediaInfo,
	CodecInfo,
	TrackInfo,
	StreamInfo,
	DTLSInfo,
	ICEInfo,
	CandidateInfo,
} = require("semantic-sdp");

function parseMediaInfo(/** @type {MediaInfo | SemanticSDP.MediaInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {MediaInfo} */ (info.constructor.name === "MediaInfo" ? (clone ? info.clone() : info) : MediaInfo.expand(info));
}
function parseCodecInfo(/** @type {CodecInfo | SemanticSDP.CodecInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {CodecInfo} */ (info.constructor.name === "CodecInfo" ? (clone ? info.clone() : info) : CodecInfo.expand(info));
}
function parseTrackInfo(/** @type {TrackInfo | SemanticSDP.TrackInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {TrackInfo} */ (info.constructor.name === "TrackInfo" ? (clone ? info.clone() : info) : TrackInfo.expand(info));
}
function parseStreamInfo(/** @type {StreamInfo | SemanticSDP.StreamInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {StreamInfo} */ (info.constructor.name === "StreamInfo" ? (clone ? info.clone() : info) : StreamInfo.expand(info));
}
function parseDTLSInfo(/** @type {DTLSInfo | SemanticSDP.DTLSInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {DTLSInfo} */ (info.constructor.name === "DTLSInfo" ? (clone ? info.clone() : info) : DTLSInfo.expand(info));
}
function parseICEInfo(/** @type {ICEInfo | SemanticSDP.ICEInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {ICEInfo} */ (info.constructor.name === "ICEInfo" ? (clone ? info.clone() : info) : ICEInfo.expand(info));
}
function parseCandidateInfo(/** @type {CandidateInfo | SemanticSDP.CandidateInfoPlain} */ info, /** @type {boolean} */ clone) {
	//@ts-expect-error
	return /** @type {CandidateInfo} */ (info.constructor.name === "CandidateInfo" ? (clone ? info.clone() : info) : CandidateInfo.expand(info));
}


//@ts-expect-error
const parseInt = /** @type {(x: number) => number} */ (global.parseInt);

function ensureString(str)
{
	return "string" === typeof str ? str : String(str);
}

/** @returns {RTPProperties} */
function parseRTPProperties(/** @type {RTPProperties | SemanticSDP.SDPInfo} */ rtp)
{
	if (rtp.constructor.name === "SDPInfo")
	{
		rtp = /** @type {SemanticSDP.SDPInfo} */ (rtp);
		return {
			"audio" : rtp.getMedia("audio"),
			"video" : rtp.getMedia("video"),
		};
	}
	return /** @type {RTPProperties} */ (rtp);
}

function convertRTPProperties(rtp)
{
	//Create new native properties object
	let properties = new Native.Properties();

	//If we have got audio
	if (rtp.audio)
	{
		let num = 0;
		
		//Supppor plain and Semantic SDP objects
		const audio = parseMediaInfo(rtp.audio, false);

		//For each codec
		for (let codec of audio.getCodecs().values())
		{
			//Item
			let item = "audio.codecs."+num;
			//Put codec
			properties.SetStringProperty(item+".codec"	, ensureString(codec.getCodec()));
			properties.SetIntegerProperty(item+".pt"	, parseInt(codec.getType()));
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetIntegerProperty(item+".rtx" , parseInt(codec.getRTX()));
			//one more
			num++;
		}
		//Set length
		properties.SetIntegerProperty("audio.codecs.length", parseInt(num));
		 
		//Reset
		num = 0;
		 
		//For each extension
		for (let [id,uri] of audio.getExtensions().entries())
		{
			 //Set properties
			properties.SetIntegerProperty("audio.ext."+num+".id"	,parseInt(id));
			properties.SetStringProperty("audio.ext."+num+".uri"	,ensureString(uri));
			//one more
			num++;
		}
		//Set length
		properties.SetIntegerProperty("audio.ext.length", parseInt(num));
	}

	//If we have got video
	if (rtp.video)
	{
		let num = 0;
		//Supppor plain and Semantic SDP objects
		const video = parseMediaInfo(rtp.video, false);
		//For each codec
		for (let codec of video.getCodecs().values())
		{
			//Item
			let item = "video.codecs."+num;
			//Put codec
			properties.SetStringProperty(item+".codec"	, ensureString(codec.getCodec()));
			properties.SetIntegerProperty(item+".pt"	, parseInt(codec.getType()));
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetIntegerProperty(item+".rtx" , parseInt(codec.getRTX()));
			//one more
			num++;
		}
		//Set length
		properties.SetIntegerProperty("video.codecs.length", parseInt(num));
		 
		//Reset
		num = 0;
		 
		//For each extension
		for (let [id,uri] of video.getExtensions().entries())
		{
			 //Set properties
			properties.SetIntegerProperty("video.ext."+num+".id"	, parseInt(id));
			properties.SetStringProperty("video.ext."+num+".uri"	, String(uri));
			//one more
			num++;
		}
		//Set length
		properties.SetIntegerProperty("video.ext.length", parseInt(num));
	}
	//Return
	return properties;
};

module.exports = {
	parseMediaInfo,
	parseCodecInfo,
	parseTrackInfo,
	parseStreamInfo,
	parseDTLSInfo,
	parseICEInfo,
	parseCandidateInfo,
	parseRTPProperties,
	convertRTPProperties : convertRTPProperties
};
