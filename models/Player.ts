const WebSocket = require('ws');

export default interface Player {
  id: string;
  address: string;
  lanAddress: string;
  socketPort: string;
  serverPort: string;
  ws: WebSocket;
  host: boolean;
}
