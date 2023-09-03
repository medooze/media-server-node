# WebRTC Medooze Media Server for Node.js

This media server will allow you to receive and send media streams from remote WebRTC peers and manage how you want to route them. 

Supported systems:

 - [x] Linux
 - [x] Mac Os X
 - [x] Raspberry Pi

## Install
 
Just add the Medooze media server as a dependency to your node project:
```
    npm i --save medooze-media-server
```
## Distribution

If you don't want to compile the native code each time you use the media server, you could precompile Medooze Media server and generate a binary package for your platform. On the Medooze media server directory just do:

```
   git submodule update --init --recursive
   npm i
   npm run-script dist
```

It will generate the binary package in `dist/medooze-media-server-x.y.x.tgz`.

To use it on your project just install it instead of the npm repository dependency:

```
    npm i --save medooze-media-server-x.y.x.tgz
```

## Usage
```javascript
const MediaServer = require('medooze-media-server');
```
## API Documention
You can check the full object documentation in [markdown](api.md) or [html](https://medooze.github.io/media-server-node/).

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
- [ ] Datachannels

## Media Server Client

You can use the [Media Server Client lib](https://github.com/medooze/media-server-client-js) for easy sync between any browser and the media server. If you do not want to depend on an external library or specifc signaling you can setup everything [manually](manual.md).

## Tracing

Medooze is instrumented with [Perfetto](https://perfetto.dev) track events.
For information about capturing and interpreting traces, see [Tracing](tracing.md).

## Author

Sergio Garcia Murillo @ Medooze 

## Contributing
To get started, [Sign the Contributor License Agreement](https://www.clahub.com/agreements/medooze/media-server-node).

## License
MIT
