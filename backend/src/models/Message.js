// model này dùng để lưu tại từng tin nhắn giữa 2 ng dùng

import mongoose from "mongoose"

// định nghĩa cấu trúc cho 1 message -> sẽ đc lưu vào db - như thiết kế các cột trong sql
const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId, // kiểu dữ liệu id chuẩn của mongo
            ref: "Conversation", // tham thiếu -> cho biết tin nhắn này thuộc về hội thoại nào
            required: true,
            index: true, // Tạo index (chỉ mục) riêng cho trường này để tìm kiếm nhanh hơn.
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        imgUrl: {
            type: String,
        }
    },
    {
        timestamps: true, // giúp tự động thêm 1 trường createdAt và updatedAt vào db mà không cần tự viết
    }
)

messageSchema.index({conversationId: 1, createdAt: -1});
/*
- compound Index:
+ Nó tạo ra một chỉ mục kết hợp giữa conversationId (sắp xếp tăng dần 1) và createdAt (sắp xếp giảm dần -1).
-> Tác dụng: Khi bạn mở một cuộc hội thoại, app thường sẽ phải truy vấn: "Lấy ra 20 tin nhắn gần nhất của conversationId là XYZ, sắp xếp theo thời gian từ mới đến cũ".
    Nhờ có đoạn code này, MongoDB sẽ lấy dữ liệu ra với tốc độ cực kỳ nhanh, ngay cả khi bảng tin nhắn của bạn có hàng triệu dòng.
*/

const Message = mongoose.model("Message",messageSchema);
// Biến messageSchema (bản vẽ) thành Message model (đối tượng thực tế) để có thể sử dụng các hàm như Message.find(), Message.create(), v.v.
export default Message

/*
1. Khi KHÔNG có đoạn code Index trên (Như một thư viện lộn xộn)
Giả sử thư viện này không được phân loại gì cả, sách vứt lung tung trên sàn.
Khi người dùng mở ứng dụng chat lên, app yêu cầu cơ sở dữ liệu: "Hãy tìm cho tôi 20 tin nhắn mới nhất của cuộc trò chuyện có ID là XYZ".
Lúc này, cơ sở dữ liệu sẽ phải làm việc rất vất vả:
Nó phải lật từng cuốn sách một trong số hàng triệu cuốn sách đó.
Kiểm tra xem cuốn nào thuộc cuộc trò chuyện XYZ thì nhặt ra một góc.
Sau khi gom đủ tất cả tin nhắn của nhóm XYZ, nó lại phải tự đi sắp xếp đống đó theo thời gian từ mới đến cũ.
Cuối cùng mới lấy ra 20 cái trên cùng trả về cho bạn.
Quá trình này gọi là "Quét toàn bộ" (Full Scan). Nếu có 100 người cùng nhắn tin một lúc, máy chủ sẽ bị quá tải và ứng dụng chat của bạn sẽ quay vòng vòng (lag) vì cơ sở dữ liệu phải làm việc quá nặng.
2. Khi CÓ đoạn code Index trên (Như một thư viện xịn có thẻ mục lục)
Đoạn code messageSchema.index({conversationId: 1, createdAt: -1}); chính là hành động tạo ra một hệ thống tủ hồ sơ thông minh cho thư viện đó.
Hệ thống tủ này được tổ chức như sau:
conversationId: 1: Gom nhóm. Nó phân loại tất cả tin nhắn vào các ngăn kéo riêng biệt. Mỗi cuộc trò chuyện (Group chat hoặc chat 1-1) có một ngăn kéo riêng biệt có dán nhãn ID rõ ràng.
createdAt: -1: Sắp xếp sẵn. Bên trong mỗi ngăn kéo đó, các tin nhắn không vứt lộn xộn, mà được xếp sẵn gọn gàng từ mới nhất đến cũ nhất (-1 là viết tắt của Descending - giảm dần về mặt thời gian).
Phép màu xảy ra khi bạn truy vấn:
Bây giờ, khi app yêu cầu "Lấy 20 tin nhắn mới nhất của nhóm XYZ", cơ sở dữ liệu chỉ làm một việc cực kỳ nhàn nhã:
Nhìn vào nhãn tủ, đi thẳng đến cái ngăn kéo có dán chữ "XYZ".
Vì sách trong ngăn kéo này đã được xếp sẵn từ mới đến cũ rồi, nó chỉ việc bốc luôn 20 cuốn trên cùng và trả về cho bạn.
Thời gian tìm kiếm giảm từ vài giây (hoặc vài chục giây nếu data lớn) xuống chỉ còn vài mili-giây (chớp mắt).

*/

/*
1. Ý nghĩa kỹ thuật của 1 và -1
Trong MongoDB:
1: Sắp xếp tăng dần (Ascending - từ thấp đến cao, từ A đến Z).
-1: Sắp xếp giảm dần (Descending - từ cao đến thấp, từ Z đến A).
2. Tại sao conversationId: 1 lại giúp "nhóm"?
Hãy tưởng tượng bạn có 1 triệu tin nhắn của 1000 cuộc trò chuyện khác nhau. Khi bạn đánh chỉ mục {conversationId: 1}, MongoDB sẽ sắp xếp lại toàn bộ tin nhắn theo ID của cuộc trò chuyện.
Vì được sắp xếp tăng dần, nên:
Tất cả tin nhắn có ID ...AAA sẽ nằm cạnh nhau.
Tất cả tin nhắn có ID ...BBB sẽ nằm cạnh nhau.
Tất cả tin nhắn có ID ...CCC sẽ nằm cạnh nhau.
=> Kết quả: Việc "sắp xếp" theo ID vô tình tạo ra các "nhóm" dữ liệu nằm san sát nhau trên ổ cứng. Khi bạn tìm conversationId: "AAA", Database chỉ cần nhảy bộ đọc đến đúng phân đoạn của "AAA" và lấy dữ liệu ra, không cần đi tìm rải rác khắp nơi.
3. Quy tắc "Từ ngoài vào trong" của Chỉ mục phức hợp
Khi bạn viết {conversationId: 1, createdAt: -1}, bạn đang ra lệnh cho Database sắp xếp theo thứ tự ưu tiên:
Ưu tiên 1 (Cấp lớn): Gom tất cả tin nhắn có cùng conversationId lại một chỗ (sắp xếp tăng dần theo ID).
Ưu tiên 2 (Cấp nhỏ): Trong "đống" tin nhắn đã được gom nhóm đó, hãy sắp xếp chúng theo thời gian createdAt giảm dần (tin mới nhất nằm trên cùng).
Ví dụ minh họa trực quan:
Hãy tưởng tượng một danh bạ điện thoại:
Nó được sắp xếp theo Họ trước (tương ứng với conversationId).
Sau đó mới sắp xếp theo Tên (tương ứng với createdAt).
Khi bạn tìm người họ "Nguyễn", bạn lật đúng trang họ "Nguyễn" (nhóm dữ liệu). Ở trong trang đó, bạn thấy các tên được xếp sẵn từ A-Z rồi, bạn chỉ việc chọn đúng người mình cần.
*/