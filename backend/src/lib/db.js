import mongoose from 'mongoose'

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING)
        console.log('lien ket csdl thanh cong')
    } catch (error) {
        console.log('loi khi ket noi csdl', error)
        process.exit(1) // dừng ctrinh nếu kh kết nối dc với db
    }
}