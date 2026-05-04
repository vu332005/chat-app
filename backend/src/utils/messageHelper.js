/*
- tác dụng -> cập nhật đoạn chat sau 1 tin nhắn 
- Cập nhật thông tin chung (conversation.set):
    + seenBy: []: Xóa rỗng danh sách những người đã xem (vì có tin mới nên mặc định chưa ai xem, ngoại trừ người gửi).
    + lastMessageAt & lastMessage: Ghi đè thông tin của tin nhắn mới nhất vào đây. Mục đích là để Frontend có thể hiển thị dòng tin nhắn ngắn gọn (VD: "Bạn: Xin chào" và thời gian) ở màn hình danh sách Chat mà không cần phải truy vấn vào bảng Message gây nặng máy.
- Tính toán số tin nhắn chưa đọc (unreadCounts):
    + Đoạn vòng lặp forEach này xử lý logic rất thông minh:
    + Đi qua từng thành viên trong phòng chat.
    + Nếu thành viên đó là Người gửi (isSender = true): Gán số tin chưa đọc bằng 0 (vì họ là người gửi nên hiển nhiên họ đã đọc).
    + Nếu thành viên đó là Người nhận: Lấy số lượng tin chưa đọc cũ cộng thêm 1 (prevCount + 1).
*/
export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId,
) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      senderId,
      createdAt: message.createdAt,
    },
  });

  conversation.participants.forEach((p) => {
    const memberId = p.userId.toString();
    const isSender = memberId === senderId.toString();
    const prevCount = conversation.unreadCounts.get(memberId) || 0;
    conversation.unreadCounts.set(memberId, isSender ? 0 : prevCount + 1);
  });
};

export const emitNewMessage = (io, conversation, message) => {
  io.to(conversation._id.toString()).emit('new-message', {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCounts: conversation.unreadCounts,
  });
};
