# WebRTC Medooze Media Server for Node.js

This media server will allow you to receive and send media streams from remote WebRTC peers and manage how you want to route them. 

Supported systems:

 - [x] Linux
 - [x] Mac Os X
 - [x] Raspberry Pi

## Install
 
Just add the Medooze media server as a dependency to your node proyect:
```
    npm i --save medooze-media-server
```
## Distribution

If you don't want to compile the native code each time you use the media server, you could precompile Medooze Media server and generate a binary package for your platform. On the Medooze media server directory just do:

```
   git submodule update
   npm i
   npm run-script dist
```

It will generate the binary package in `dist\medooze-media-server-x.y.x.tgz`.

To use it on your project just install it instead of the npm repository dependency:

```
    npm i --save medooze-media-server-x.y.x.tgz
```

## Usage
```javascript
const MediaServer = require('medooze-media-server');
```
## API Documention
You can check the full [object documentation here](https://medooze.github.io/media-server-node/).

## Support
To discuss issues related to this project or ask for help please [join the google community group](https://groups.google.com/forum/#!forum/medooze).

## Demo application
You can check a demo application [here](https://github.com/medooze/media-server-demo-node)

## Functionality
We intend to implement support the following features:

- [x] MP4 multitrack recording support for all WebRTC codecs: H264,VP8,VP9, OPUS and PCMU/A.
- [x] [VP9 SVC](https://tools.ietf.org/html/draft-ietf-payload-vp9-02) layer selection
- [x] Simulcast with temporal layer selection
- [x] [RTP transport wide congestion control](https://tools.ietf.org/html/draft-holmer-rmcat-transport-wide-cc-extensions-01)
- [x] Sender side BitRate estimation
- [ ] [Flex FEC draft 3](https://tools.ietf.org/html/draft-ietf-payload-flexible-fec-scheme-03)
- [x] NACK and RTX support
- [x] [RTCP reduced size] (https://tools.ietf.org/html/rfc5506)
- [x] Bundle
- [x] ICE lite
- [x] [Frame Marking] (https://tools.ietf.org/html/draft-ietf-avtext-framemarking-04)
- [x] [PERC double encryption] (https://tools.ietf.org/html/draft-ietf-perc-double-03)
- [x] Plain RTP broadcasting/streaming
- [ ] [Layer Refresh Request (LRR) RTCP Feedback Message] (https://datatracker.ietf.org/doc/html/draft-ietf-avtext-lrr-04)
- [ ] MPEG DASH
- [ ] Datachannels

## Tutorial

### Intialization

First import both Medooze media server and Semantic SDP dependecies:

```javascript
//Get the Medooze Media Server interface
const MediaServer = require('medooze-media-server');
const SemanticSDP = require("semantic-sdp");
```

Then you need to create an Endpoint, which will create an UDP socket for receiving connection. You need to pass the `ip` address in which this Enpoint will be accesible by the WebRTC clients. This is typically the public IP address of the server, ans will be used on the ICE candidates sent to the browser on the SDP.

```javascript
//Create UDP server endpoint
const endpoint = MediaServer.createEndpoint(ip);
```

Now you are ready to connect to your server.

### Connect a client

On your browser, create an SDP offer and sent it to your server (via websockets for example). Once you have it, you will have to parse it to extract the requried information. 
With that information, you can create an ICE+DTLS transport on the `Endpoint`.

```javascript
//Process the sdp
var offer = SemanticSDP.SDPInfo.process(sdp);

//Create an DTLS ICE transport in that enpoint
const transport = endpoint.createTransport({
	dtls : offer.getDTLS(),
	ice  : offer.getICE() 
});
```

Now set the RTP remote properties for both audio and video:

```javascript	
//Set RTP remote properties
 transport.setRemoteProperties({
	audio : offer.getMedia("audio"),
	video : offer.getMedia("video")
});
```

You can start creating the answer now. First get the ICE and DTLS info from the `Transport` and the ICE candidate into from the `Endpoint`

```javascript
//Get local DTLS and ICE info
const dtls = transport.getLocalDTLSInfo();
const ice  = transport.getLocalICEInfo();

//Get local candidates
const candidates = endpoint.getLocalCandidates();

//Create local SDP info
const answer = new SDPInfo();

//Add ice and dtls info
answer.setDTLS(dtls);
answer.setICE(ice);
//Add candidates
answer.addCandidate(candidates);
```

Choose your codecs and set RTP parameters to answer the offer:
 
```javascript
//Get remote audio m-line info 
const audioOffer = offer.getMedia("audio");

//If we have audio
if (audioOffer)
{
	//Create audio media
	const audio = audioOffer.answer({
		codecs		: CodecInfo.MapFromNames(["opus"]),
		extensions	: new Set([
			"urn:ietf:params:rtp-hdrext:ssrc-audio-level",
			"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"
	]);
	//Add it to answer
	answer.addMedia(audio);
}

//Get remote video m-line info 
const videoOffer = offer.getMedia("video");

//If offer had video
if (videoOffer)
{
	//Create video media
	const  video = videoOffer.answer({
		codecs		: CodecInfo.MapFromNames(["vp9","flexfec-03"],true),
		extensions	: new Set([
			"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
			"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"
		])
	});
	//Add it to answer
	answer.addMedia(video);
}
```

Set the our negotiated RTP properties on the transport

```javascript
//Set RTP local  properties
transport.setLocalProperties({
	audio : answer.getMedia("audio"),
	video : answer.getMedia("video")
});
```

### Stream management

You need to process the stream offered by the client, so extract the stream info from the SDP offer, and create an `IncomingStream` object.

```javascript
//Get first stream offered
const offered = offer.getStreams()[0];

//Create the remote stream into the transport
const incomingStream = transport.createIncomingStream(offered);
```

Now, for example, create an outgoing stream, and add it to the answer so the browser is aware of it.

```javascript
//Create new local stream
const outgoingStream  = transport.createOutgoingStream({
	audio: true,
	video: true
});

//Get local stream info
const info = outgoingStream.getStreamInfo();

//Add local stream info it to the answer
answer.addStream(info);
```

You can attach an `OutgoingStream` to an `IncomingStream`, this will create a `Transponder` array that will forward the incoming data to the ougoing stream, it will allow you also to apply transoformations to it (like SVC layer selection).

In this case, as you are attaching an incoming stream to an outgoing stream from the same client, you will get audio and video loopback on the client.

```javascript
//Copy incoming data from the remote stream to the local one
const transponders = outgoingStream.attachTo(incomingStream);
```

You can now send answer the SDP to the client.
```
//Get answer SDP
const str = answer.toString();
```

### Recording
### Playback
### Streaming

## Author

Sergio Garcia Murillo @ Medooze 

## Contributing
To get started, [Sign the Contributor License Agreement](https://www.clahub.com/agreements/medooze/media-server-node").

## License
MIT
