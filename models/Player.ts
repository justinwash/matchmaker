export default interface Player {
  id: string;
  address: string;
  lanAddress: string;
  serverPort: string;
  gameId: string;
  matchFound: boolean;
  opponent: Player;
  host: boolean;
  timeout: NodeJS.Timeout;
}
