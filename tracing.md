# Tracing

The Medooze media server is being instrumented with [Perfetto](https://perfetto.dev), a production grade tracing SDK.
Tracing can help you find bottlenecks in the media server pipeline as well as debug a range of issues.

This documents the general approach, instructions for tracing and interpreting the traces.

## Design

As [detailed in the media server itself](https://github.com/medooze/media-server/blob/master/tracing.md), instrumentation code is gated behind a define. This addon enables it when building Medooze and provides the Tracing SDK bundled in `external/perfetto`. The Tracing SDK is then initialized (at addon load time) as indicated in the section below.

The Tracing SDK is statically compiled with the addon, so it's currently not possible to add custom events (from i.e. other native addons) to the captured trace. However, the Perfetto daemon should still be able to combine traces from multiple instances of the SDK. Also, as indicated in the media server, there's currently no stability guarantee regarding the tracing events and their attributes.

It was decided to bundle Perfetto (because of its portability), and to always compile with it (because the performance hit is [minimal](https://perfetto.dev/docs/instrumentation/track-events#performance) when tracing is disabled). In the future, an option could be provided to easily compile the addon without Perfetto (i.e. to reduce binary size).

## Trace capture

Perfetto currently has [two backends](https://perfetto.dev/docs/instrumentation/tracing-sdk#in-process-vs-system-mode) providing different features, which can be simultaneously active. When the Node.js addon loads, it decides which backends to enable and then initializes Perfetto. The backends are:

 - **System mode**. The addon tries to connect to the Perfetto daemon over a Unix socket, and sends traces there. This setup is the most flexible one, since the daemon can gather data from other sources as well (such as ftrace) and output a combined trace.

   Since all control (start / stop tracing, configuration, etc.) happens through the daemon, this backend has no API.
   However, because of security reasons, this backend will only be enabled if the `MEDOOZE_TRACING` environment variable is set to `1` when the addon loads.

 - **In-process mode**. The addon itself produces the trace file. This setup doesn't offer the features of system mode, but provides an API to control tracing. The API mainly takes a file descriptor (to write the trace at), and a Protobuf message (describing the configuration).

   We've thought about exposing a JS API to use this backend, but it's currently not implemented. Therefore, this backend is never enabled.

## Viewing traces

Right now only [track events](https://perfetto.dev/docs/instrumentation/track-events) are used, and there's no custom attributes, so [Perfetto UI](https://ui.perfetto.dev) is all you need to visualize captured traces. Perfetto can handle reasonably big traces (with 2GB often being an approximate maximum), see its manual for more info.

Each endpoint has its own thread, whose name can be changed through the `setThreadName` API. This will help you locate the track(s) belonging to it.

You'll probably see a track for the main Node.js event loop as well, however since Node.js isn't instrumented, only some events will appear there.
