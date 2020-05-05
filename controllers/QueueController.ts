import Player from '../models/Player';
import { v4 as uuid } from 'uuid';

export default class QueueController {
  players: Player[] = [];
  queue: Player[] = [];

  startTimer() {
    setInterval(() => {
      this.queue.length >= 2 ? this.startAvailableMatches() : null;
    }, 3000);
  }

  connect(req, res) {
    var duplicate = this.players.find((p) => {
      return (
        (p.address == req.headers['x-forwarded-for'] || req.connection.remoteAddress) &&
        p.lanAddress == req.query.lanAddress &&
        p.serverPort == req.query.serverPort
      );
    });

    if (duplicate) {
      res.json({
        message: `duplicate player: ${duplicate.id}`,
        data: {
          id: duplicate.id,
        },
      });
      return;
    }

    let player: Player = {
      id: uuid(),
      address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      lanAddress: req.query.lanAddress,
      serverPort: req.query.serverPort,
      gameId: req.query.gameId,
      matchFound: null,
      opponent: null,
      host: false,
      timeout: null,
    };

    player.timeout = setTimeout(() => this.timeout(player), 300000); // disconnect if no activity for 5 minutes

    this.players.push(player);

    res.json({
      message: `player connected: ${player.id}`,
      data: {
        id: player.id,
        address: player.address,
        lanAddress: player.lanAddress,
        serverPort: player.serverPort,
        gameId: player.gameId,
        matchFound: player.matchFound,
        opponent: player.opponent,
        host: player.host,
        timeout: this.getTimeUntilDisconnect(player.timeout),
      },
    });

    console.log(`player connected: ${player.id}`);
  }

  info(req, res) {
    var player = this.players.find((p) => p.id == req.query.playerId);
    if (player) {
      res.json({
        message: `player information: ${player.id}`,
        data: {
          id: player.id,
          address: player.address,
          lanAddress: player.lanAddress,
          serverPort: player.serverPort,
          gameId: player.gameId,
          matchFound: player.matchFound,
          opponent: player.opponent,
          host: player.host,
          timeout: this.getTimeUntilDisconnect(player.timeout),
        },
      });
    } else {
      res.json({ message: `player not found: ${req.query.playerId}` });
    }

    this.resetTimeout(player);
  }

  disconnect(req, res) {
    var playerToDisconnect = this.players.indexOf(this.players.find((p) => p.id == req.query.playerId));

    if (playerToDisconnect != -1) {
      this.removePlayerFromQueue(this.players[playerToDisconnect]);
      if (this.players.splice(playerToDisconnect)) {
        console.log(`player disconnected: ${req.query.playerId}`);
        res.json({ message: `disconnected: ${req.query.playerId}` });
      } else {
        res.json({ message: `error disconnecting player: ${req.query.playerId}` });
      }
    } else {
      res.json({ message: `not connected: ${req.query.playerId}` });
    }
  }

  ping(req, res) {
    var player = this.players.find((p) => p.id == req.query.playerId);
    if (player) {
      this.resetTimeout(player);
      res.json({
        message: `connection ok: ${player.id}`,
        data: {
          timeout: this.getTimeUntilDisconnect(player.timeout),
        },
      });
    } else {
      res.json({ message: `timed out. pls reconnect.` });
    }
  }

  getTimeUntilDisconnect(timeout) {
    return Math.ceil((timeout._idleStart + timeout._idleTimeout - Date.now()) / 1000);
  }

  resetTimeout(player) {
    clearTimeout(player.timeout);
    player.timeout = setTimeout(() => this.timeout(player), 300000);
  }

  timeout(player) {
    var playerToDrop = this.players.indexOf(player);
    this.players.splice(playerToDrop);
    console.log(`player timed out: ${player.id}`);
  }

  joinQueue(req, res) {
    var playerToAdd = this.players.find((p) => p.id == req.query.playerId);

    if (playerToAdd) {
      playerToAdd.matchFound = false;
      if (this.addPlayerToQueue(playerToAdd)) {
        res.json({ message: `added to queue: ${playerToAdd.id}` });
        console.log(`player added to queue: ${playerToAdd.id}`);
        this.resetTimeout(playerToAdd);
      } else {
        res.json({ message: `already in queue: ${playerToAdd.id}` });
      }
    } else {
      res.json({ message: `not connected: ${req.query.playerId}` });
    }
  }

  addPlayerToQueue(player) {
    var playerToAdd = this.queue.find((p) => p == player);

    if (!playerToAdd) {
      player.matchFound = false;
      this.queue.push(player);
      console.log(this.queue);
      return true;
    } else {
      return false;
    }
  }

  exitQueue(req, res) {
    var playerToRemove = this.players.find((p) => p.id == req.query.playerId);

    if (playerToRemove) {
      if (this.removePlayerFromQueue(playerToRemove)) {
        res.json({ message: `removed from queue: ${playerToRemove.id}` });
        console.log(`player removed from queue: ${playerToRemove.id}`);
        this.resetTimeout(playerToRemove);
      } else {
        res.json({ message: `not in queue: ${playerToRemove.id}` });
      }
    } else {
      res.json({ message: `not connected: ${req.query.playerId}` });
    }
  }

  removePlayerFromQueue(player) {
    var playerToRemove = this.queue.indexOf(player);

    if (playerToRemove != -1) {
      this.queue.splice(playerToRemove);
      return true;
    } else {
      return false;
    }
  }

  getQueueStatus(req, res) {
    var player = this.players.find((p) => p.id == req.query.playerId);

    if (!player) {
      res.json({
        message: `not connected`,
      });
      return;
    }

    if (player && player.matchFound && player.opponent) {
      res.json({
        message: `match found`,
        data: player.opponent,
      });

      this.resetTimeout(player);
      return;
    } else if (this.queue.indexOf(player) != -1) {
      res.json({
        message: `in queue`,
        data: {
          playersInQueue: this.queue.length,
        },
      });

      this.resetTimeout(player);
      return;
    } else {
      res.json({
        message: `not in queue`,
        data: {
          playersInQueue: this.queue.length,
        },
      });
    }
  }

  startAvailableMatches() {
    try {
      if (this.queue.length >= 2) {
        console.log('starting all available matches');
        this.queue.forEach((player, index) => {
          let player1 = player;
          let player2 = this.queue[index + 1];

          player1.host = true;
          player1.matchFound = true;
          player1.opponent = player2;

          player2.host = false;
          player2.matchFound = true;
          player2.opponent = player1;
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
