import { io } from 'socket.io-client';

const URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
