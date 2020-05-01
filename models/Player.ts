const WebSocket = require('ws');

export default interface Player {
  id: string;
  address: string;
  port: string;
  ws: WebSocket;
  host: boolean;
}
