# WebRTC Medooze Media Server for Node.js

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/72346e5229bc4fd8af091312be091fdd)](https://www.codacy.com/app/murillo128/media-server-node?utm_source=github.com&utm_medium=referral&utm_content=medooze/media-server-node&utm_campaign=badger)

This media server will allow you to receive and send media streams from remote WebRTC peers and manage how you want to route them. 

## Install

    npm i --save medooze-media-server

## Usage
```javascript
const MediaServer = require('medooze-media-server');
```
## API Documention
You can check the full [object documentation here](https://medooze.github.io/media-server-node/).

## Support
To discuss issues related to this project or ask for help please [join the google comunity group](https://groups.google.com/forum/#!forum/medooze).

## Demo application
You can check a demo application [here](https://github.com/medooze/media-server-demo-node)

# Functionality
We intent to implement support the following features:

- [x] MP4 multitrack recording support for all WebRTC codecs: H264,VP8,VP9, OPUS and PCMU/A.
- [x] [VP9 SVC](https://tools.ietf.org/html/draft-ietf-payload-vp9-02) layer selection
- [ ] Simulcast
- [x] [RTP transport wide congestion control](https://tools.ietf.org/html/draft-holmer-rmcat-transport-wide-cc-extensions-01)
- [ ] Sender side BitRate estimation: algorithm not decided yet candidates are [GCC](https://tools.ietf.org/html/draft-ietf-rmcat-gcc-02), [NADA](https://tools.ietf.org/html/draft-ietf-rmcat-nada-03) or [SCREAM](https://tools.ietf.org/html/draft-ietf-rmcat-scream-cc-07)
- [ ] [Flex FEC draft 3](https://tools.ietf.org/html/draft-ietf-payload-flexible-fec-scheme-03)
- [x] NACK and RTX support
- [x] [RTCP reduced size] (https://tools.ietf.org/html/rfc5506)
- [x] Bundle
- [x] ICE lite
- [x] Frame Marking
- [x] PERC double encryption
- [x] Plain RTP broadcasting/streaming
- [ ] MPEG DASH
- [ ] Datachannels

## Example

```javascript
const SemanticSDP	= require("semantic-sdp");

//Process the sdp
var offer = SemanticSDP.SDPInfo.process(sdp);

//Get the Medooze Media Server interface
const MediaServer = require('medooze-media-server');

//Create UDP server endpoint
const endpoint = MediaServer.createEndpoint(ip);

//Create an DTLS ICE transport in that enpoint
const transport = endpoint.createTransport({
	dtls : offer.getDTLS(),
	ice  : offer.getICE() 
});
	
//Set RTP remote properties
 transport.setRemoteProperties({
	audio : offer.getMedia("audio"),
	video : offer.getMedia("video")
});


//Get local DTLS and ICE info
const dtls = transport.getLocalDTLSInfo();
const ice  = transport.getLocalICEInfo();

//Get local candidates
const candidates = endpoint.getLocalCandidates();

//Create local SDP info
let answer = new SDPInfo();

//Add ice and dtls info
answer.setDTLS(dtls);
answer.setICE(ice);
//Add candidates
for (let i=0;i<candidates.length;++i)
	//Add candidate to media info
	answer.addCandidate(candidates[i]);

//Get remote audio m-line info 
let audioOffer = offer.getMedia("audio");

//If we have audio
if (audioOffer)
{
	//Create audio media
	let audio = new MediaInfo("audio", "audio");
	
	//Get codec type
	let opus = audioOffer.getCodec("opus");
	//Add opus codec
	audio.addCodec(opus);

	//Add audio extensions
	for (let [id, uri] of audioOffer.getExtensions().entries())
		//Add it
		audio.addExtension(id, uri);
	//Add it to answer
	answer.addMedia(audio);
}

//Get remote video m-line info 
let videoOffer = offer.getMedia("video");

//If offer had video
if (videoOffer)
{
	//Create video media
	let  video = new MediaInfo("video", "video");
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
	for (let [id, uri] of videoOffer.getExtensions().entries())
		//Add it
		video.addExtension(id, uri);

	//Add it to answer
	answer.addMedia(video);
}

//Set RTP local  properties
transport.setLocalProperties({
	audio : answer.getMedia("audio"),
	video : answer.getMedia("video")
});

//For each stream offered
for (let offered of offer.getStreams().values())
{
	//Create the remote stream into the transport
	const incomingStream = transport.createIncomingStream(offered);
	
	//Record it
	recorder.record(incomingStream);
	
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

Sergio Garcia Murillo @ Medooze 

## License
MIT
