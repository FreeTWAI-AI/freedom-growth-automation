# Media worker — planned boundary

`capabilities.json` records an unavailable component. There is no executable media
worker, render service, FFmpeg process, provider integration, or queue consumer in
this release. No media job should be routed here. Future implementations must use
the canonical Platform job protocol and the separate scoped media broker; they
must not connect to the Platform database or reuse a publication credential.
