const ytdl = require('ytdl-core');
const FFmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const events = require('events');
const fs = require('fs');

const streamEmitter = new events.EventEmitter();

function streamify(uri, opt) {
  const options = {
    ...opt,
    videoFormat: 'mp4',
    quality: 'lowest',
    audioFormat: 'mp3',
    filter(format) {
      return format.container === options.videoFormat && format.audioEncoding;
    },
  };

  const streamPromise = ytdl
    .getInfo(uri)
    .then((info) => {
      const isLive = info.player_response.videoDetails.isLiveContent;
      let streamSource;
      if (isLive) {
        streamSource = ytdl.chooseFormat(info.formats, {
          quality: 'highestaudio',
        }).url;
      } else {
        streamSource = ytdl.downloadFromInfo(info, options);
      }

      streamSource.isLive = isLive;
      streamSource.info = info;

      return streamSource;
    })
    .then((streamSource) => {
      const { isLive } = streamSource;
      const {
        file, audioFormat, bitrate, startTime,
      } = options;
      const stream = file ? fs.createWriteStream(file) : new PassThrough();
      const audioBitrate = bitrate || 128;
      const audioStartTime = startTime;
      const ffmpeg = new FFmpeg(streamSource);

      let output = ffmpeg.audioCodec('libmp3lame');
      // Disable for undefined and livestreams
      if (audioStartTime && !isLive) {
        output.setStartTime(audioStartTime);
      }
      output = output
        .audioBitrate(audioBitrate)
        .format(audioFormat)
        .pipe(stream);

      // Error Emitters
      // If it is NOT a livestream url, it has event listeners
      if (!isLive) {
        streamSource.on('error', (error) => {
          streamEmitter.emit('error', error);
        });
      }

      ffmpeg.on('error', (error) => {
        streamEmitter.emit('error', error);
      });

      output.on('error', (error) => {
        // If it is NOT a livestream url, it must be a readable stream
        // which can be stopped when an error occurs
        if (!isLive) {
          streamSource.end();
        }

        streamEmitter.emit('error', error);
      });

      stream.source = streamSource;
      stream.info = streamSource.info;
      stream.ffmpeg = ffmpeg;
      stream.isLive = isLive;
      stream.emitter = streamEmitter;

      return stream;
    })
    .catch((err) => {
      throw err;
    });

  return streamPromise;
}

module.exports = streamify;
