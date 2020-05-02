const express = require('express');
const app = express();
const port = 3000;

import QueueController from './controllers/QueueController';
const qController = new QueueController();

qController.startTimer();

app.get('/connect', (req, res) => {
  try {
    qController.connect(req, res);
  } catch {
    console.log('connect failed. bad request?');
  }
});

app.listen(port, () => console.log(`Matchmaking server listening at http://localhost:${port}`));