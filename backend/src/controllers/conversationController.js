import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { io } from '../socket/index.js';

// xử lý tạo phòng chat cho direct / group
export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    // validate
    if (
      !type ||
      (type === 'group' && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: 'Tên nhóm và danh sách thành viên là bắt buộc' });
    }

    let conversation;

    // xử lý case: chat cá nhân (1- 1)
    if (type === 'direct') {
      const participantId = memberIds[0];

      // tìm xem có phòng chat nào mà danh sách ng tham gia có đủ cả Id của 2 ng kh
      // nếu có -> dùng luôn
      // kh có -> tạo mới
      conversation = await Conversation.findOne({
        type: 'direct',
        'participants.userId': { $all: [userId, participantId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          type: 'direct',
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });

        await conversation.save();
      }
    }

    // xử lý case: group
    if (type === 'group') {
      conversation = new Conversation({
        type: 'group',
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: {
          name,
          createdBy: userId,
        },
        lastMessageAt: new Date(),
      });

      await conversation.save();
    }

    if (!conversation) {
      return res
        .status(400)
        .json({ message: 'Conversation type không hợp lệ' });
    }

    /*
    - gắn thông tin chi tiết
    + vì participants chỉ đang chứa các mã ID của ng dùng
    -> ta sẽ populate -> chạy sang bảng user lấy tên/ ava để cho fe
    */
    await conversation.populate([
      { path: 'participants.userId', select: 'displayName avatarUrl' },
      {
        path: 'seenBy',
        select: 'displayName avatarUrl',
      },
      { path: 'lastMessage.senderId', select: 'displayName avatarUrl' },
    ]);

    // const participants = (conversation.participants || []).map((p) => ({
    //   _id: p.userId?._id,
    //   displayName: p.userId?.displayName,
    //   avatarUrl: p.userId?.avatarUrl ?? null,
    //   joinedAt: p.joinedAt,
    // }));

    // const formatted = { ...conversation.toObject(), participants };

    // if (type === 'group') {
    //   memberIds.forEach((userId) => {
    //     io.to(userId).emit('new-group', formatted);
    //   });
    // }

    // if (type === 'direct') {
    //   io.to(userId).emit('new-group', formatted);
    //   io.to(memberIds[0]).emit('new-group', formatted);
    // }

    return res.status(201).json({ conversation });
  } catch (error) {
    console.error('Lỗi khi tạo conversation', error);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// lấy các conversation của user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // lấy tất cả các conversation của userId
    const conversations = await Conversation.find({
      'participants.userId': userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({
        path: 'participants.userId',
        select: 'displayName avatarUrl',
      })
      .populate({
        path: 'lastMessage.senderId',
        select: 'displayName avatarUrl',
      })
      .populate({
        path: 'seenBy',
        select: 'displayName avatarUrl',
      });

    // formatted dlieu cho fe
    /*
            🔴 TRƯỚC KHI FORMAT (Dữ liệu trả về từ .populate())
        Cấu trúc bị lồng sâu ở đoạn participants.userId:

        JSON
        {
        "_id": "conv_123",
        "type": "group",
        "unreadCounts": { "user_1": 2, "user_2": 0 },
        "participants": [
            {
            "joinedAt": "2024-03-24T10:00:00.000Z",
            "userId": {
                "_id": "user_1",
                "displayName": "Hoàng",
                "avatarUrl": "hoang.jpg"
            }
            }
        ]
        }
        🟢 SAU KHI FORMAT (Dữ liệu cuối cùng gửi cho Frontend)
        Dữ liệu đã được "san phẳng", Frontend chỉ cần gọi participant.displayName cực kỳ nhàn:

        JSON
        {
        "conversations": [
            {
            "_id": "conv_123",
            "type": "group",
            "unreadCounts": { "user_1": 2, "user_2": 0 },
            "participants": [
                {
                "_id": "user_1",
                "displayName": "Hoàng",
                "avatarUrl": "hoang.jpg",
                "joinedAt": "2024-03-24T10:00:00.000Z"
                }
            ]
            }
        ]
        }
      */
    const formatted = conversations.map((convo) => {
      const participants = (convo.participants || []).map((p) => ({
        _id: p.userId?._id,
        displayName: p.userId?.displayName,
        avatarUrl: p.userId?.avatarUrl ?? null,
        joinedAt: p.joinedAt,
      }));

      return {
        ...convo.toObject(),
        unreadCounts: convo.unreadCounts || {},
        participants,
      };
    });

    return res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error('Lỗi xảy ra khi lấy conversations', error);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// lấy các tin nhắn chi tiết từ 1 conversation -> phân trang bằng cursor
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;

    const query = { conversationId };

    // -> nếu cursor vẫn còn - kph null -> còn tin nhắn cũ hơn -> query lấy tin cũ hơn

    // Nếu có cursor: Toán tử $lt (Less Than - Nhỏ hơn) sẽ yêu cầu Database: "Chỉ lấy những tin nhắn được tạo ra TRƯỚC mốc thời gian này (tức là những tin nhắn cũ hơn)".
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);
    //.limit(limit + 1): Thay vì lấy đúng 50 tin, bạn lấy 51 tin.
    // ->  Tin nhắn thứ 51 này sẽ không trả về cho người dùng, mà nó đóng vai trò làm "kẻ dò đường" để xem liệu còn tin nhắn cũ hơn trong Database hay không.

    let nextCursor = null;

    if (messages.length > Number(limit)) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }
    /*
    Nếu số lượng lấy ra > 50 (nghĩa là có 51 tin), chứng tỏ vẫn còn tin nhắn cũ hơn. Ta lấy thời gian của tin nhắn thứ 51 đó làm nextCursor gửi cho Frontend.
    Nếu số lượng lấy ra <= 50, chứng tỏ đã hết sạch tin nhắn (chạm tới tin nhắn đầu tiên của nhóm). nextCursor sẽ bằng null, Frontend biết để ẩn nút "Tải thêm" hoặc ngừng gọi API khi cuộn.
    
    !!**
    -> đơn giản là nếu ta lấy ra được 51 tin -> nghĩa là còn tin nhắn cũ
    - ta sẽ để tin thứ 51 là nextcursor -> mốc thời gian để nếu cần lấy thêm
    -> fe chỉ cần gửi nextcursor đó -> ta sẽ lấy thêm các tin cũ từ mốc đó trở đi
    */

    messages = messages.reverse();

    return res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error('Lỗi xảy ra khi lấy messages', error);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};
/*
- ở đây ta sẽ dùng thời gian tạo là cursor -> khi muốn lấy thêm thì chỉ cần lấy tin cũ hơn cursor

Giả sử phòng chat có 100 tin nhắn. Frontend yêu cầu lấy mỗi lần 3 tin (limit=3).
- Lần tải đầu tiên (Frontend không gửi cursor - Mở màn hình chat):
    + Backend quét lấy 4 tin nhắn mới nhất (Tin 100, 99, 98, 97).
    + Thấy có 4 tin (> 3), cắt tin thứ 4 (Tin 97) làm con trỏ: nextCursor = "thời-gian-của-tin-97".
    + Bỏ Tin 97 ra, còn [100, 99, 98].
    + Đảo ngược lại và trả về Frontend: messages: [98, 99, 100]. (Hiển thị đẹp trên UI).
- Lần tải thứ hai (Người dùng cuộn lên trên cùng):
    + Frontend gửi API kèm cursor="thời-gian-của-tin-97".
    + Backend quét lấy 4 tin nhắn cũ hơn Tin 97 (Sẽ lấy Tin 97, 96, 95, 94).
    + Thấy có 4 tin (> 3), lấy Tin 94 làm con trỏ: nextCursor = "thời-gian-của-tin-94".
    + Bỏ Tin 94 ra, còn [97, 96, 95].
    + Đảo ngược lại và trả về: messages: [95, 96, 97].
    + Frontend nhận được, nối mảng này vào TRƯỚC mảng cũ trên UI -> Trở thành [95, 96, 97, 98, 99, 100]. Vuốt cực kỳ mượt!
*/

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { 'participants.userId': userId },
      { _id: 1 },
    );

    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error('Lỗi khi fetch conversations: ', error);
    return [];
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation không tồn tại' });
    }

    const last = conversation.lastMessage;

    if (!last) {
      return res
        .status(200)
        .json({ message: 'Không có tin nhắn để mark as seen' });
    }

    if (last.senderId.toString() === userId) {
      return res.status(200).json({ message: 'Sender không cần mark as seen' });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      {
        new: true,
      },
    );

    io.to(conversationId).emit('read-message', {
      conversation: updated,
      lastMessage: {
        _id: updated?.lastMessage._id,
        content: updated?.lastMessage.content,
        createdAt: updated?.lastMessage.createdAt,
        sender: {
          _id: updated?.lastMessage.senderId,
        },
      },
    });

    return res.status(200).json({
      message: 'Marked as seen',
      seenBy: updated?.seenBy || [],
      myUnreadCount: updated?.unreadCounts[userId] || 0,
    });
  } catch (error) {
    console.error('Lỗi khi mark as seen', error);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};
