const express = require('express');
const app = express();
const port = 3000;

import QueueController from './controllers/QueueController';
const qController = new QueueController();

qController.startTimer();

app.get('/', (req, res) => {
  res.json('GET on / not allowed');
});

app.get('/connect', (req, res) => {
  try {
    qController.connect(req, res);
  } catch (err) {
    console.log(`connect failed: ${err}`);
    res.json(`connect failed: ${err}`);
  }
});

app.get('/info', (req, res) => {
  try {
    qController.info(req, res);
  } catch (err) {
    console.log(`info request failed: ${err}`);
    res.json(`info request failed: ${err}`);
  }
});

app.get('/disconnect', (req, res) => {
  try {
    qController.disconnect(req, res);
  } catch (err) {
    console.log(`disconnect request failed: ${err}`);
    res.json(`disconnect request failed: ${err}`);
  }
});

app.get('/ping', (req, res) => {
  try {
    qController.ping(req, res);
  } catch (err) {
    console.log(`ping request failed: ${err}`);
    res.json(`ping request failed: ${err}`);
  }
});

app.get('/joinQueue', (req, res) => {
  try {
    qController.joinQueue(req, res);
  } catch (err) {
    console.log(`join queue request failed: ${err}`);
    res.json(`join queue request failed: ${err}`);
  }
});

app.get('/exitQueue', (req, res) => {
  try {
    qController.exitQueue(req, res);
  } catch (err) {
    console.log(`exit queue request failed: ${err}`);
    res.json(`exit queue request failed: ${err}`);
  }
});

app.get('/getQueueStatus', (req, res) => {
  try {
    qController.getQueueStatus(req, res);
  } catch (err) {
    console.log(`get queue status request failed: ${err}`);
    res.json(`get queue status request failed: ${err}`);
  }
});

app.listen(process.env.PORT || port, () =>
  console.log(`Matchmaking server listening on port ${process.env.PORT || port}`)
);
