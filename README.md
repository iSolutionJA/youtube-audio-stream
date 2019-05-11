# youtube-audio-stream

[![code-style](https://img.shields.io/badge/code_style-airbnb--base-brightgreen.svg)](https://github.com/airbnb/javascript)

## Credit

This packaged was originally created by James Kyburz and the repo can be found here: [https://github.com/JamesKyburz/youtube-audio-stream](https://github.com/JamesKyburz/youtube-audio-stream)

## Improvements

- Returns a promise instead of a stream. Promise when resolved returns:
  - the stream
  - the [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) instance
  - the info from [ytdl-core](https://github.com/fent/node-ytdl-core). See [here](https://github.com/fent/node-ytdl-core/blob/master/example/info.json) for what it contains
- Livestreams are now supported
- The example now accepts an arbitrary videoId.
- Update Dockerfile to use Node version 10 and ffmpeg version 4
- Two new options:
  - `Bitrate` - the bitrate ffmpeg must use to convert the audio stream to. Defaults to `128`. See [here](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#audiobitratebitrate-set-audio-bitrate) for possible values.
  - `Start time` - the time the video should begin. Does not apply to live streams. See [here](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#seekinputtime-set-input-start-time) for possible values.

New options example:

```js
// Encode audio at a 192 bitrate and start the audio 30 seconds in
const streamPromise = youtubeAudioStream(requestUrl, {bitrate: 192, startTime: 30});
```

## Description

To get the youtube video's download stream, the modules uses [ytdl-core](https://github.com/fent/node-ytdl-core).

To convert to audio, the module uses [fluent-ffmpeg](https://github.com/schaermu/node-fluent-ffmpeg).

You will need to have [ffmpeg](https://www.ffmpeg.org/) and the necessary encoding libraries and ffmpeg needs to be in the OS's PATH. If you're on OSX, this can be handled easily using [Homebrew](https://brew.sh/) (`brew install ffmpeg`). Otherwise visit [https://github.com/adaptlearning/adapt_authoring/wiki/Installing-FFmpeg](https://github.com/adaptlearning/adapt_authoring/wiki/Installing-FFmpeg)

## Installation

Via npm:

```bash
npm install @isolution/youtube-audio-stream
```

## Usage

Here is an example that creates an express server with one route and streams the audio to the response. To hear the audio for a specific video:

1. Get a videoId
2. Go to `localhost:3000/:videoId`

```js
const express = require('express');
const app = express();
const port = 3000;

app.get('/:videoId', async (req, res) => {
  const requestUrl = `http://youtube.com/watch?v=${req.params.videoId}`;
  const streamPromise = youtubeAudioStream(requestUrl);
  streamPromise
    .then((stream) => {
      stream.on('error', (err) => {
        console.log(`err:${err}`);
      });
      stream.pipe(res);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});
```

## Testing

### Testing locally

This package comes with a simple example for testing. This can be run with the command `npm run example`, which will start a basic http server that serves two routes, first one sends an html file to `localhost:3000/` and the second one streams audio to the response using this package.

### Testing inside a docker container

You can test this module without the need to have [ffmpeg](https://www.ffmpeg.org/) locally installed by doing it inside a docker container.

To build the docker image:

```docker
docker build --rm -f "Dockerfile" -t youtube-audio-stream:latest .
```

To run the test:

```docker
docker run --rm -d -p --restart on-failure:3 3000:3000/tcp youtube-audio-stream:latest
```

## Issues

There is currently an issue on certain videos where it returns a 403 unauthorized code which causes the package to essentially crash. See [#417](https://github.com/fent/node-ytdl-core/issues/417)
