const express = require('express');
const app = express();
const port = 3000;

import QueueController from './controllers/QueueController';
const qController = new QueueController();

qController.startTimer();

app.get('/connect', (req, res) => {
  qController.connect(req, res);
});

app.listen(port, () => console.log(`Matchmaking server listening at http://localhost:${port}`));
