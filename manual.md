# Tutorial
This document will show you how to setup and endpoint and transport manually.

## Initialization

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

## Connect a client

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
	const audio = audioOffer.answer(MediaServer.getDefaultCapabilities().audio);
	//Add it to answer
	answer.addMedia(audio);
}

//Get remote video m-line info 
const videoOffer = offer.getMedia("video");

//If offer had video
if (videoOffer)
{
	//Create video media
	const  video = videoOffer.answer(MediaServer.getDefaultCapabilities().video);
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

## Stream management

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