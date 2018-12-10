const express = require('express');
const rp = require('request-promise');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const APP_TITLE = 'HLS demo';
const APP_URL = 'http://localhost:3000';
// sample videos database
const videos = [
  { id: 'video-1', title: 'Video 1' },
  { id: 'video-2', title: 'Video 2' },
  { id: 'video-3', title: 'Video 3' },
  { id: 'video-4', title: 'Video 4' },
];

// Home page
router.get('/', (req, res, next) => {
  res.render('index', { title: APP_TITLE, videos });
});

// Video page
router.get('/videos/:id', (req, res, next) => {
  const videoId = req.params.id;
  const video = videos.find(video => video.id === videoId);

  if (!video) {
    res.status(404).end('Video not found');
    return;
  }

  // Now call api to get HLS url for this video
  const options = {
    method: 'GET',
    uri: `${APP_URL}/api/videos/${videoId}`,
    json: true,
    simple: false,
  };
  rp(options)
    .then((apiResponse) => {
      res.render('show', { title: `${APP_TITLE} - ${video.title}`, video, hls_url: apiResponse.hls_url });
    })
    .catch(next);
});

// api endpint to get HLS url
router.get('/api/videos/:id', (req, res, next) => {
  const videoId = req.params.id;
  const video = videos.find(video => video.id === videoId);

  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }

  res.json({
    hls_url: `/api/stream/${video.id}`,
  });
});

// api endpint streams video
router.get('/api/stream/:id', (req, res, next) => {
  const videoId = req.params.id;
  const video = videos.find(video => video.id === videoId);

  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }

  const videoFilePath = path.resolve(`assets/videos/${videoId}.mp4`);

  fs.stat(videoFilePath, (err, stat) => {
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : fileSize - 1;

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoFilePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoFilePath).pipe(res);
    }
  });
});

module.exports = router;
