# WebRTC Medooze Media Server for Node.js

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/72346e5229bc4fd8af091312be091fdd)](https://www.codacy.com/app/murillo128/media-server-node?utm_source=github.com&utm_medium=referral&utm_content=medooze/media-server-node&utm_campaign=badger)

This media server will allow you to receive and send media streams from remote WebRTC peers and manage how you want to route them. 
You will be able to record any incoming stream into an mp4 file.
SVC layer selection and simulcast support.

## Install

    npm i --save medooze-media-server

## Usage
```javascript
const MediaServer = require('medooze-media-server');
```
## API Documention
You can check the full object documentation [here](/docs).

## Example

```javascript
//Get the Medooze Media Server interface
const MediaServer = require('medooze-media-server');

//Create UDP server endpoint
const endpoint = MediaServer.createEndpoint(ip);

//Create an DTLS ICE transport in that enpoint
const transport = endpoint.createTransport({
		dtls : offer.getMedias()[0].getDTLS(),
		ice  : offer.getMedias()[0].getICE() 
	});
	
//Set RTP remote properties
 transport.setRemoteProperties({
		audio : offer.getAudio(),
		video : offer.getVideo()
	});


//Get local DTLS and ICE info
const dtls = transport.getLocalDTLSInfo();
const ice  = transport.getLocalICEInfo();

//Get local candidte
const candidate = endpoint.getLocalCandidate();

//Create local SDP info
let answer = new SDPInfo();

//Set RTP local  properties
 transport.setLocalProperties({
		audio : answer.getAudio(),
		video : answer.getVideo()
	});
	

//Get remote audio m-line info 
let audioOffer = offer.getAudio();

//If we have audio
if (audioOffer!=null)
{
	//Create audio media
	let audio = new MediaInfo("audio", "audio");
	//Add ice and dtls info
	audio.setDTLS(dtls);
	audio.setICE(ice);
	audio.addCandidate(candidate);
	//Get codec type
	let opus = audioOffer.getCodec("opus");
	//Add opus codec
	audio.addCodec(opus);

	//Add audio extensions
	for (let extension of audioOffer.getExtensions().entries())
		//Add it
		audio.addExtension(extension[0], extension[1]);
	//Add it to answer
	answer.addMedia(audio);
}

//Get remote video m-line info 
let videoOffer = offer.getVideo();

//If offer had video
if (videoOffer!=null)
{
	//Create video media
	let  video = new MediaInfo("video", "video");
	//Add ice and dtls info
	video.setDTLS(dtls);
	video.setICE(ice);
	video.addCandidate(candidate);
	//Get codec types
	let vp9 = videoOffer.getCodec("vp9");
	let fec = videoOffer.getCodec("flexfec-03");
	//Add video codecs
	video.addCodec(vp9);
	if (fec!=null)
		video.addCodec(fec);
	//Limit incoming bitrate
	video.setBitrate(1024);

	//Add video extensions
	for (let extension of videoOffer.getExtensions().entries())
		//Add it
		video.addExtension(extension[0], extension[1]);

	//Add it to answer
	answer.addMedia(video);
}

//For each stream offered
for (let offered of offer.getStreams().values())
{
	//Create the remote stream into the transport
	const incomingStream = transport.createIncomingStream(offered);
	
	//Create new local stream
	const outgoingStream  = transport.createOutgoingStream({
		audio: true,
		video: true
	});

	//Get local stream info
	const info = outgoingStream.getStreamInfo();
	
	//Copy incoming data from the remote stream to the local one
	outgoingStream.attachTo(incomingStream);
	
	//Add local stream info it to the answer
	answer.addStream(info);
}
//Get answer SDP
const str = answer.toString();
```

## Author

Sergio Garcia Murillo

## License
MIT
