const Native		= require("./Native");
const SemanticSDP	= require("semantic-sdp");
const MediaInfo		= SemanticSDP.MediaInfo;


function ensureString(str)
{
	return "string" === typeof str ? str : String(str);
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
		const audio = rtp.audio.constructor.name === "MediaInfo" ? rtp.audio : MediaInfo.expand(rtp.audio);

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
		const video = rtp.video.constructor.name === "MediaInfo" ? rtp.video : MediaInfo.expand(rtp.video);
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
	convertRTPProperties : convertRTPProperties
};
