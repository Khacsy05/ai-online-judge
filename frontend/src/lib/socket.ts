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

  // Nếu socket đã kết nối và đúng userId thì tái sử dụng, không tạo mới
  if (socketInstance && currentSocketUserId === userId && socketInstance.connected) {
    return socketInstance;
  }

  // Nếu đổi user khác, ngắt kết nối cũ trước khi tạo kết nối mới
  if (socketInstance) {
    if (currentSocketUserId !== userId) {
      socketInstance.disconnect();
      socketInstance = null;
    } else {
      return socketInstance;
    }
  }

  currentSocketUserId = userId;
  socketInstance = io(socketUrl, {
    auth: { userId },
    transports: ["websocket"],
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
