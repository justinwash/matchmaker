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
        request: 'connect',
        success: true,
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
      request: 'connect',
      success: true,
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
        request: 'info',
        success: true,
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
      res.json({
        request: 'info',
        success: false,
        message: `player not found: ${req.query.playerId}`,
      });
    }

    this.resetTimeout(player);
  }

  disconnect(req, res) {
    var playerToDisconnect = this.players.indexOf(this.players.find((p) => p.id == req.query.playerId));

    if (playerToDisconnect != -1) {
      this.removePlayerFromQueue(this.players[playerToDisconnect]);
      if (this.players.splice(playerToDisconnect)) {
        console.log(`player disconnected: ${req.query.playerId}`);
        res.json({
          request: 'disconnect',
          success: true,
          message: `disconnected: ${req.query.playerId}`,
        });
      } else {
        res.json({
          request: 'disconnect',
          success: false,
          message: `error disconnecting player: ${req.query.playerId}`,
        });
      }
    } else {
      res.json({
        request: 'disconnect',
        success: false,
        message: `not connected: ${req.query.playerId}`,
      });
    }
  }

  ping(req, res) {
    var player = this.players.find((p) => p.id == req.query.playerId);
    if (player) {
      this.resetTimeout(player);
      res.json({
        request: 'ping',
        success: true,
        message: `connection ok: ${player.id}`,
        data: {
          timeout: this.getTimeUntilDisconnect(player.timeout),
        },
      });
    } else {
      res.json({
        request: 'ping',
        success: false,
        message: `timed out. pls reconnect.`,
      });
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
        res.json({
          request: 'joinQueue',
          success: true,
          message: `added to queue: ${playerToAdd.id}`,
        });
        console.log(`player added to queue: ${playerToAdd.id}`);
        this.resetTimeout(playerToAdd);
      } else {
        res.json({
          request: 'joinQueue',
          success: false,
          message: `already in queue: ${playerToAdd.id}`,
        });
      }
    } else {
      res.json({
        request: 'joinQueue',
        success: false,
        message: `not connected: ${req.query.playerId}`,
      });
    }
  }

  addPlayerToQueue(player) {
    var playerToAdd = this.queue.find((p) => p == player);

    if (!playerToAdd) {
      player.matchFound = false;
      this.queue.push(player);
      return true;
    } else {
      return false;
    }
  }

  exitQueue(req, res) {
    var playerToRemove = this.players.find((p) => p.id == req.query.playerId);

    if (playerToRemove) {
      if (this.removePlayerFromQueue(playerToRemove)) {
        res.json({
          request: 'exitQueue',
          success: true,
          message: `removed from queue: ${playerToRemove.id}`,
        });
        console.log(`player removed from queue: ${playerToRemove.id}`);
        this.resetTimeout(playerToRemove);
      } else {
        res.json({
          request: 'exitQueue',
          success: false,
          message: `not in queue: ${playerToRemove.id}`,
        });
      }
    } else {
      res.json({
        request: 'exitQueue',
        success: false,
        message: `not connected: ${req.query.playerId}`,
      });
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
        request: 'getQueueStatus',
        success: false,
        message: `not connected`,
      });
      return;
    }

    if (player && player.matchFound && player.opponent) {
      res.json({
        request: 'getQueueStatus',
        success: true,
        message: `match found`,
        data: {
          player: {
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
          opponent: player.opponent,
        },
      });

      this.resetTimeout(player);
      return;
    } else if (this.queue.indexOf(player) != -1) {
      res.json({
        request: 'getQueueStatus',
        success: true,
        message: `in queue`,
        data: {
          playersInQueue: this.queue.length,
        },
      });

      this.resetTimeout(player);
      return;
    } else {
      res.json({
        request: 'getQueueStatus',
        success: false,
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
          player1.opponent = {
            id: player2.id,
            address: player2.address,
            lanAddress: player2.lanAddress,
            serverPort: player2.serverPort,
            gameId: player2.gameId,
            matchFound: player2.matchFound,
            opponent: player2.opponent,
            host: player2.host,
            timeout: this.getTimeUntilDisconnect(player2.timeout),
          };

          player2.host = false;
          player2.matchFound = true;
          player2.opponent = {
            id: player1.id,
            address: player1.address,
            lanAddress: player1.lanAddress,
            serverPort: player1.serverPort,
            gameId: player1.gameId,
            matchFound: player1.matchFound,
            opponent: player1.opponent,
            host: player1.host,
            timeout: this.getTimeUntilDisconnect(player1.timeout),
          };
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
