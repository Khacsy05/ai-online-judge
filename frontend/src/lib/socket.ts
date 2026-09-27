import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;
let currentSocketUserId: string | null = null;

export function getSocket(userId?: string): Socket | null {
  if (typeof window === "undefined") return null;

  if (!userId) {
    return socketInstance;
  }

  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
    "http://localhost:3001";

  // Nếu socket đã tạo cho đúng userId này thì tái sử dụng
  if (socketInstance && currentSocketUserId === userId) {
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  // Nếu đổi user khác, ngắt kết nối cũ trước khi tạo kết nối mới
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentSocketUserId = userId;
  socketInstance = io(socketUrl, {
    auth: { userId },
    query: { userId },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentSocketUserId = null;
  }
}
