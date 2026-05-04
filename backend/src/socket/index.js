import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import { socketAuthMiddleware } from '../middlewares/socketMiddleware.js';
import { getUserConversationsForSocketIO } from '../controllers/conversationController.js';

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const onlineUsers = new Map(); /// {unserId: socketId}

io.on('connection', async (socket) => {
  const user = socket.user;
  console.log(`${user.displayName} online với socket ${socket.id}`);

  // khi có ng dùng online -> phát tín hiệu online về fe
  onlineUsers.set(user._id, socket.id);
  io.emit('online-users', Array.from(onlineUsers.keys()));

  // cho user join vào đúng room -> để khi nhắn tin -> sẽ emit vào đúng room
  const conversationIds = await getUserConversationsForSocketIO(user._id);
  conversationIds.forEach((id) => {
    socket.join(id);
  });

  socket.on('disconnect', () => {
    // nếu ng dùng off -> xóa tín hiệu online đi -> gửi lại tín hiệu những ng đang online khác
    onlineUsers.delete(user._id);
    io.emit('online-users', Array.from(onlineUsers.keys()));
    /* console.log(`socket disconnected: ${socket.id}`); */
  });
});

export { io, app, server };
