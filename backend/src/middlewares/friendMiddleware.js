import Conversation from '../models/Conversation.js';
import Friend from '../models/Friend.js';

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

// middleware check xem 2 ng có phải là bạn bè không -> để cho phép thực hiện gửi tin nhắn / thêm vào nhóm
export const checkFriendship = async (req, res, next) => {
  try {
    const me = req.user._id.toString();
    const recipientId = req.body?.recipientId ?? null;
    const memberIds = req.body?.memberIds ?? [];

    // check tính hợp lệ của req
    if (!recipientId && memberIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'Cần cung cấp recipientId hoặc memberIds' });
    }

    // xử lý chat 1 - 1
    if (recipientId) {
      const [userA, userB] = pair(me, recipientId);

      const isFriend = await Friend.findOne({ userA, userB });

      if (!isFriend) {
        return res
          .status(403)
          .json({ message: 'Bạn chưa kết bạn với người này' });
      }

      return next();
    }

    // xử lý chat nhóm -> check xem các thành viên trong nhóm có phải fr của ng tạo không
    // (kco recipientId -> chat nhóm)
    const friendChecks = memberIds.map(async (memberId) => {
      const [userA, userB] = pair(me, memberId);
      const friend = await Friend.findOne({ userA, userB });
      return friend ? null : memberId;
    });

    const results = await Promise.all(friendChecks);
    const notFriends = results.filter(Boolean);
    /*
    - Promise.all: Yêu cầu Database kiểm tra tất cả mọi người CÙNG MỘT LÚC. 
      -> Giúp API chạy chớp nhoáng. Mảng results lúc này trông sẽ giống thế này: [null, "id_nguoi_la", null, "id_nguoi_la_2"].
    - .filter(Boolean): Đây là một "mẹo" (trick) rất xịn trong Javascript. 
      -> Nó sẽ tự động vứt bỏ tất cả các giá trị "falsy" (như null, undefined, 0, "") ra khỏi mảng. Kết quả notFriends chỉ còn lại danh sách ID của những người lạ: ["id_nguoi_la", "id_nguoi_la_2"].
    */

    if (notFriends.length > 0) {
      // nếu có ng kph bạn bè -> kh thể thêm dc
      return res
        .status(403)
        .json({ message: 'Bạn chỉ có thể thêm bạn bè vào nhóm.', notFriends });
    }

    next();
  } catch (error) {
    console.error('Lỗi xảy ra khi checkFriendship:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// check xem 1 ng có thuộc 1 nhóm chat không
export const checkGroupMembership = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }

    const isMember = conversation.participants.some(
      (p) => p.userId.toString() === userId.toString(),
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Bạn không ở trong group này.' });
    }

    req.conversation = conversation;

    next();
  } catch (error) {
    console.error('Lỗi checkGroupMembership:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};
