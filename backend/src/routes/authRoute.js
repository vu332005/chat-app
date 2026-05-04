import express from 'express'
import { signUp, signIn, signOut, refreshToken } from '../controllers/authController.js'

const router = express.Router()

router.post("/signup",signUp) // đây là 1 api

router.post("/signin", signIn)

router.post("/signout",signOut)

router.post("/refresh", refreshToken);
export default router
// đây là ta định nghĩa 1 route cụ thể -> app.use() gắn router, router tạo API.