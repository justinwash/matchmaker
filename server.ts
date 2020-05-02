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

app.listen(process.env.PORT || port, () => console.log(`Matchmaking server listening at http://localhost:${port}`));
