const ytdl = require('ytdl-core');
const FFmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const fs = require('fs');

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

  const ytdlPromise = ytdl
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
    .catch(err => err);

  const streamPromise = ytdlPromise
    .then((streamSource) => {
      const { isLive } = streamSource;
      const {
        file, audioFormat, bitrate, startTime,
      } = options;
      const stream = file ? fs.createWriteStream(file) : new PassThrough();
      const audioBitrate = bitrate || 128;
      const audioStartTime = startTime;
      const ffmpeg = new FFmpeg(streamSource);

      process.nextTick(() => {
        const output = ffmpeg.audioCodec('libmp3lame');
        // Disable for undefined and livestreams
        if (audioStartTime && !isLive) {
          output.setStartTime(audioStartTime);
        }
        output
          .audioBitrate(audioBitrate)
          .format(audioFormat)
          .pipe(stream);

        // Error Emitters
        ffmpeg.on('error', (error) => {
          stream.emit('error', error);
        });

        output.on('error', (error) => {
          // If it is NOT a livestream url, it must be a readable stream
          // which can be stopped when an error occurs
          if (!isLive) {
            streamSource.end();
          }
          stream.emit('error', error);
        });
      });

      stream.info = streamSource.info;
      stream.ffmpeg = ffmpeg;

      return stream;
    })
    .catch(err => err);

  return streamPromise;
}

module.exports = streamify;
