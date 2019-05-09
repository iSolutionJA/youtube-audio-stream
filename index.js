#!/usr/bin/env node
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

  const video = ytdl(uri, options);

  const { file, audioFormat, bitrate } = options;
  const stream = file ? fs.createWriteStream(file) : new PassThrough();
  const audioBitrate = bitrate || 128;
  const ffmpeg = new FFmpeg(video);

  process.nextTick(() => {
    const output = ffmpeg
      .audioCodec('libmp3lame')
      .audioBitrate(audioBitrate)
      .format(audioFormat)
      .pipe(stream);

    ffmpeg.on('error', (error) => {
      stream.emit('error', error);
    });

    output.on('error', (error) => {
      video.end();
      stream.emit('error', error);
    });
  });

  stream.video = video;
  stream.ffmpeg = ffmpeg;

  return stream;
}

if (!module.parent) {
  const youtubeUrl = process.argv.slice(2)[0];
  if (!youtubeUrl) throw new TypeError('youtube url not specified');
  streamify(youtubeUrl).pipe(process.stdout);
} else {
  module.exports = streamify;
}
