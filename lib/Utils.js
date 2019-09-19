const Native		= require("./Native");
const SemanticSDP	= require("semantic-sdp");
const MediaInfo		= SemanticSDP.MediaInfo;

function convertRTPProperties(rtp)
{
	//Create new native properties object
	let properties = new Native.PropertiesFacade();

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
			properties.SetPropertyStr(item+".codec",codec.getCodec());
			properties.SetPropertyInt(item+".pt",codec.getType());
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetPropertyInt(item+".rtx",codec.getRTX());
			//one more
			num++;
		}
		//Set length
		properties.SetPropertyInt("audio.codecs.length", num);
		 
		//Reset
		num = 0;
		 
		//For each extension
		for (let [id,uri] of audio.getExtensions().entries())
		{
			 //Set properties
			properties.SetPropertyInt("audio.ext."+num+".id"	,id);
			properties.SetPropertyStr("audio.ext."+num+".uri"	,uri);
			//one more
			num++;
		}
		//Set length
		properties.SetPropertyInt("audio.ext.length", num);
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
			properties.SetPropertyStr(item+".codec",codec.getCodec());
			properties.SetPropertyInt(item+".pt",codec.getType());
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetPropertyInt(item+".rtx",codec.getRTX());
			//one more
			num++;
		}
		//Set length
		properties.SetPropertyInt("video.codecs.length", num);
		 
		//Reset
		num = 0;
		 
		//For each extension
		for (let [id,uri] of video.getExtensions().entries())
		{
			 //Set properties
			properties.SetPropertyInt("video.ext."+num+".id"	,id);
			properties.SetPropertyStr("video.ext."+num+".uri"	,uri);
			//one more
			num++;
		}
		//Set length
		properties.SetPropertyInt("video.ext.length", num);
	}
	//Return
	return properties;
};

module.exports = {
	convertRTPProperties : convertRTPProperties
};
