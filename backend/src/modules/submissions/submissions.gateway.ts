import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class SubmissionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Tự động kích hoạt và xử lý khi có client kết nối
    handleConnection(client: Socket) {
        // 1. Lấy userId từ dữ liệu auth gửi kèm khi bắt tay
        // Lấy userId từ auth (cho Web) HOẶC từ query (cho Postman)
        const userId = client.handshake.auth.userId || client.handshake.query.userId;


        if (userId) {
            // 2. Cho client vào phòng riêng user_userId tương ứng luôn
            const roomName = `user_${userId}`;
            client.join(roomName);

            console.log(`🔌 Thiết bị kết nối thành công: ${client.id} | Tự động vào phòng: ${roomName}`);
        } else {
            console.log(`🔌 Thiết bị kết nối ẩn danh (không gửi userId): ${client.id}`);
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`❌ Thiết bị ngắt kết nối: ${client.id}`);
    }

    // Hàm gửi kết quả vẫn giữ nguyên
    sendGradingResult(userId: string, data: any) {
        const roomName = `user_${userId}`;
        this.server.to(roomName).emit('gradingFinished', data);
        console.log(`📡 Đã phát sự kiện 'gradingFinished' tới phòng: ${roomName}`);
    }
}
