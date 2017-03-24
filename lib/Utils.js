const native = require("../build/Release/medooze-media-server");

function convertRTPProperties(rtp)
{
	//Create new native properties object
	let properties = new native.PropertiesFacade();

	//If we have got audio
	if (rtp.audio)
	{
		let num = 0;
		//For each codec
		for (let codec of rtp.audio.getCodecs().values())
		{
			//Item
			let item = "audio.codecs."+num;
			//Put codec
			properties.SetProperty(item+".codec",codec.getCodec());
			properties.SetProperty(item+".pt",codec.getType());
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetProperty(item+".rtx",codec.getRTX());
			//one more
			num++;
		}
		//Set length
		properties.SetProperty("audio.codecs.length", num);
		 
		//Reset
		num = 0;
		 
		//For each extension
		for (let [id,uri] of rtp.audio.getExtensions().entries())
		{
			 //Set properties
			properties.SetProperty("audio.ext."+num+".id"	,id);
			properties.SetProperty("audio.ext."+num+".uri"	,uri);
			//one more
			num++;
		}
		//Set length
		properties.SetProperty("audio.ext.length", num);
	}

	//If we have got video
	if (rtp.video)
	{
		let num = 0;
		//For each codec
		for (let codec of rtp.video.getCodecs().values())
		{
			//Item
			let item = "video.codecs."+num;
			//Put codec
			properties.SetProperty(item+".codec",codec.getCodec());
			properties.SetProperty(item+".pt",codec.getType());
			//If it has rtx
			if (codec.rtx)
				//Set rtx
				properties.SetProperty(item+".rtx",codec.getRTX());
			//one more
			num++;
		}
		//Set length
		properties.SetProperty("video.codecs.length", num);
		 
		//Reset
		num = 0;
		 
		//For each extension
		for (let [id,uri] of rtp.video.getExtensions().entries())
		{
			 //Set properties
			properties.SetProperty("video.ext."+num+".id"	,id);
			properties.SetProperty("video.ext."+num+".uri"	,uri);
			//one more
			num++;
		}
		//Set length
		properties.SetProperty("video.ext.length", num);
	}
	//Return
	return properties;
};

module.exports = {
	convertRTPProperties : convertRTPProperties
};