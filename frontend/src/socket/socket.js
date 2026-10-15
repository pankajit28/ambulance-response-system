import { io } from "socket.io-client";
import { getToken } from "../api/client";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io("/", {
      autoConnect: false,
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
