import Player from '../models/Player';
import { v4 as uuid } from 'uuid';
const WebSocket = require('ws');

export default class QueueController {
  players: any[] = [];
  queue: any[] = [];

  startTimer() {
    setInterval(() => {
      this.queue.length >= 2 ? this.startAvailableMatches() : null;
    }, 3000);
  }

  connect(req, res) {
    let player: Player = {
      id: uuid(),
      address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      port: req.query.port,
      ws: null,
      host: false,
    };

    let connection = new WebSocket(`ws://[${player.address}]:${player.port}`);

    connection.on('open', () => {
      connection.send(
        JSON.stringify({
          type: 'confirmation',
          data: `matchmaking server connected to websocket on ${player.port}`,
        })
      );
    });

    connection.on('message', (message) => {
      if (message.toString() == 'connected') {
        console.log(`connection to player ${player.id} successful`);
      }

      if (message.toString() == 'start matching') {
        var indexToAdd = this.queue.indexOf(player);
        if (indexToAdd == -1) {
          this.queue.push(player);
          console.log(`player ${player.id} added to the queue`);
        } else {
          console.log(`player ${player.id} already in the queue`);
        }
      }

      if (message.toString() == 'cancel matching') {
        var indexToRemove = this.queue.indexOf(player);
        if (indexToRemove != -1) {
          this.queue.splice(indexToRemove);
          console.log(`player ${player.id} removed from the queue`);
        } else {
          console.log(`player ${player.id} not in the queue`);
        }
      }
    });

    connection.on('close', () => {
      var indexToRemove = this.players.indexOf(player);
      if (indexToRemove != -1) {
        this.players.splice(indexToRemove);
        console.log(`player ${player.id} disconnected`);
      } else {
        console.log(`player ${player.id} not connected`);
      }
    });

    player.ws = connection;
    this.players.push(player);

    res.json(`server reached successfully`);
  }

  startAvailableMatches() {
    try {
      if (this.queue.length >= 2) {
        console.log('starting all available matches');
        this.queue.forEach((player, index) => {
          let player1 = player;
          player1.host = true;

          player.ws.send(
            JSON.stringify({
              type: 'start game',
              data: {
                networking_mode: 'server',
              },
            })
          );

          let player2 = this.queue[index + 1];
          player2.ws.send(
            JSON.stringify({
              type: 'start game',
              data: {
                networking_mode: 'client',
                server_address: `${player.address}`,
              },
            })
          );

          this.queue.splice(index, 2);
        });
      } else {
        console.log('not enough players to start a match');
        return 'fail';
      }
    } catch (err) {
      console.log('error starting matches', err);
    }
  }
}
