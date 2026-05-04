import Friend from '../models/Friend.js';
import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';

export const sendFriendRequest = async (req, res) => {
  try {
    const { to, message } = req.body;

    const from = req.user._id;

    if (from === to) {
      return res
        .status(400)
        .json({ message: 'không thể gửi lời mời kết bạn cho chính mình' });
    }

    const userExists = await User.exists({ _id: to });

    if (!userExists) {
      return res.status(404).json({ message: 'người dùng không tồn tại' });
    }

    let userA = from.toString();
    let userB = to.toString();

    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    //check xem đã là bạn bè chưa / 1 trong 2 đã gửi lời mời trc đó chưa
    const [alreadyFriends, existingRequest] = await Promise.all([
      Friend.findOne({ userA, userB }),
      FriendRequest.findOne({
        $or: [
          { from, to },
          { from: to, to: from },
        ],
      }),
    ]);

    if (alreadyFriends) {
      return res.status(400).json({ message: 'Hai người đã là bạn bè' });
    }

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: 'Đã có lời mời kết bạn đang chờ' });
    }

    const request = await FriendRequest.create({
      from,
      to,
      message,
    });

    return res
      .status(201)
      .json({ message: 'gửi lời mời kết bạn thành công', request });
  } catch (error) {
    console.log('Lỗi khi gửi yêu cầu kết bạn', error);
    return res.status(500).json({ message: 'lỗi hệ thống' });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res
        .status(404)
        .json({ message: 'không tìm thấy lời mời kết bạn ' });
    }

    //check để đảm bảo chỉ có đúng ng nhận mới có thể accept req
    if (request.to.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: 'bạn không có quyền chấp nhận lời mời kết bạn này' });
    }

    // accept -> tạo bạn bè
    const friend = await Friend.create({
      userA: request.from,
      userB: request.to,
    });

    await FriendRequest.findByIdAndDelete(requestId);

    const from = await User.findById(request.from)
      .select('_id displayName avatarUrl')
      .lean();

    return res.status(200).json({
      message: 'chấp nhận lời mời kết bạn thành công',
      newFriend: {
        _id: from?._id,
        displayName: from?.displayName,

        avatarUrl: from?.avatarUrl,
      },
    });
  } catch (error) {
    console.log('Lỗi khi chấp nhận lời mời kết bạn', error);
    return res.status(500).json({ message: 'lỗi hệ thống' });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy lời mời kết bạn' });
    }

    if (request.to.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: 'Bạn không có quyền từ chối lời mời này' });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    return res.sendStatus(204);
  } catch (error) {
    console.log('Lỗi khi từ chối lời mời kết bạn', error);
    return res.status(500).json({ message: 'lỗi hệ thống' });
  }
};

export const getAllFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const friendships = await Friend.find({
      $or: [
        {
          userA: userId,
        },
        {
          userB: userId,
        },
      ],
    })
      .populate('userA', '_id displayName avatarUrl username')
      // populate -> mongooes tự động nhảy sang bảng user -> tìm userId tương ứng và lấy các trường dữ liệu chỉ định nhét vào
      .populate('userB', '_id displayName avatarUrl username')
      .lean();
    /*
      - Mặc định, Mongoose trả về một "Document Object" rất nặng, chứa hàng tá các hàm ẩn (như .save(), .remove()).
      .lean() ép Mongoose biến kết quả thành một Object Javascript thuần tuý (JSON). Nó giúp truy vấn nhanh hơn gấp nhiều lần và tốn ít RAM máy chủ hơn. Vì ở đây ta chỉ cần lấy dữ liệu ra để "đọc" (không cần sửa đổi/lưu lại)
      */

    if (!friendships.length) {
      return res.status(200).json({ friends: [] });
    }

    // lấy danh sách bạn bè của userId
    const friends = friendships.map((f) =>
      f.userA._id.toString() === userId.toString() ? f.userB : f.userA,
    );

    return res.status(200).json({ friends });
  } catch (error) {
    console.log('Lỗi khi lấy danh sách bạn bè', error);
    return res.status(500).json({ message: 'lỗi hệ thống' });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const populateFields = '_id username displayName avatarUrl';

    // lấy danh sách friendRequest đã gửi và đã nhận
    const [sent, received] = await Promise.all([
      FriendRequest.find({ from: userId }).populate('to', populateFields), // dsach đã gửi
      FriendRequest.find({ to: userId }).populate('from', populateFields), // dsach đã nhận
    ]);

    res.status(200).json({ sent, received });
  } catch (error) {
    console.log('Lỗi khi danh sách yêu cầu kết bạn', error);
    return res.status(500).json({ message: 'lỗi hệ thống' });
  }
};
