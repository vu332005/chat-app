import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

friendSchema.pre('save', async function () {
  const a = this.userA.toString();
  const b = this.userB.toString();

  if (a > b) {
    this.userA = new mongoose.Types.ObjectId(b);
    this.userB = new mongoose.Types.ObjectId(a);
  }
});
/*
Đây là đoạn Middleware pre("save") – nghĩa là đoạn code sẽ tự động chạy ngay trước khi dữ liệu được lưu vào Database.
Mục đích của nó là gì? Trong thực tế, "Nhân kết bạn với Hoàng" hay "Hoàng kết bạn với Nhân" thì cũng chỉ tạo ra 1 mối quan hệ duy nhất.
Nếu không xử lý, database của bạn có thể lưu thành 2 dòng khác nhau:
Dòng 1: userA: Nhan, userB: Hoang
Dòng 2: userA: Hoang, userB: Nhan
=> Việc này gây rác database và rất khó để truy vấn sau này.
Giải pháp của bạn: Biến 2 ID thành chuỗi (String), so sánh theo bảng chữ cái (a > b), và luôn ép ID nào nhỏ hơn nằm ở userA, ID lớn hơn nằm ở userB. Bất kể ai là người bấm nút kết bạn trước!
*/

friendSchema.index({ userA: 1, userB: 1 }, { unique: true });
/*
unique nghĩa là Duy nhất / Không được trùng lặp.
Khi bạn thêm tùy chọn này vào cái Index ở trên, bạn đang thiết lập một quy luật thép cho Database: "Tuyệt đối không bao giờ được phép có 2 dòng dữ liệu chứa CÙNG MỘT CẶP userA và userB".
*/

const Friend = mongoose.model('Friend', friendSchema);

export default Friend;
