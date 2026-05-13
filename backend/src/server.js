import express from 'express';
import dotenv from 'dotenv'; // -> giúp đọc biến mtrg từ file .env
import { connectDB } from './lib/db.js';
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { app, server } from './socket/index.js';
import { v2 as cloudinary } from "cloudinary";


dotenv.config(); // nạp biến mtrg vào process.env

// const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: 'http://localhost:5173', // Địa chỉ Frontend của bạn (Vite mặc định là 5173)
    credentials: true, // Cho phép gửi cookie/token
  }),
);

// middlewares
app.use(express.json());
app.use(cookieParser()); ////// dkmmm

// CLOUDINARY Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//public routes
app.use('/api/auth', authRoute); // -> mỗi request bdau bằng api/auth sẽ dc chuyển vào authroute để xứ lý  -> app.use() gắn router, router tạo API xử lý req.

// private routes
app.use(protectedRoute);
app.use('/api/users', userRoute);
app.use('/api/friends', friendRoute);
app.use('/api/messages', messageRoute);
app.use('/api/conversations', conversationRoute);

// connect db thành công và bắt đầu -> kết nối cổng -> ta dùng server thay cho app -> server đã đc bọc socket.io
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`server bat dau tren cong ${PORT}`);
  });
});

/*

.use() là một method của Express app hoặc router dùng để gắn middleware hoặc router vào một path nhất định.
    + syntax: app.use([path], callback)
        path (tùy chọn): đường dẫn mà middleware sẽ được áp dụng.
        callback: middleware function hoặc router sẽ xử lý request.

+ Middleware = hàm trung gian giúp xử lý request trước khi tới route hoặc response trước khi về client.

+ Middleware chạy theo thứ tự khai báo trong code.
*/
