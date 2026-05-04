// file cho avatar của user
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

// type là để biết ảnh sẽ nằm trong đâu -> để hiển thị đúng kích thước
interface IUserAvatarProps {
  type: "sidebar" | "chat" | "profile";
  name: string;
  avatarUrl?: string;
  className?: string;
}

const UserAvatar = ({ type, name, avatarUrl, className }: IUserAvatarProps) => {
  const bgColor = !avatarUrl ? "bg-blue-500" : "";

  if (!name) {
    name = "Moji";
  }

  return (
    <Avatar
      className={cn(
        className ?? "",
        type === "sidebar" && "size-12 text-base",
        type === "chat" && "size-8 text-sm",
        type === "profile" && "size-24 text-3xl shadow-md",
      )}
    >
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback className={`${bgColor} text-white font-semibold`}>
        {name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;

/*
Avatar, AvatarFallback, AvatarImage: Đây là các component con được lấy từ thư mục UI của dự án.
Avatar: Khung chứa bên ngoài.
AvatarImage: Thẻ hiển thị hình ảnh thực tế.
AvatarFallback: Phần hiển thị dự phòng (thường là chữ cái đầu của tên) khi hình ảnh bị lỗi, chưa tải xong, hoặc người dùng không có ảnh.
*/
