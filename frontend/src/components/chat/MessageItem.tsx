// component này hiển thị từng tin nhắn trong cuộc trò chuyện

import { cn, formatMessageTime } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Badge } from "../ui/badge";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
}

const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
  lastMessageStatus,
}: MessageItemProps) => {
  // vì mảng bị đảo ngược -> tin nhắn trc tin nhắn hiện tại phải là message[index + 1] 
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;

  // tính xem khi nào thì hiện thời gian
  const isShowTime =
    !prev ||
    new Date(message.createdAt).getTime() -
      new Date(prev.createdAt).getTime() >
      300000; // 5 phút

  // check xem khi nào thì hiện ava
  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

  // lấy thông tin ng gửi
  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString(),
  );

  return (
    <div className="flex flex-col">
      {/* time */}
      {isShowTime && (
        <span className="flex justify-center text-xs text-muted-foreground px-1">
          {formatMessageTime(new Date(message.createdAt))}
        </span>
      )}
      
      {/* định tuyến tin nhắn nằm bên trái / phải */}
      <div
        className={cn(
          "flex gap-2 message-bounce mt-1",
          message.isOwn ? "justify-end" : "justify-start",
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isGroupBreak && (
              <UserAvatar
                type="chat"
                name={participant?.displayName ?? "Moji"}
                avatarUrl={participant?.avatarUrl ?? undefined}
              />
            )}
          </div>
        )}

        {/* tin nhắn */}
        <div
          className={cn(
            "max-w-xs lg:max-w-md space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start",
          )}
        >
          <div
            className={cn(
              "p-3 rounded-2xl",
              message.isOwn
                ? "chat-bubble-sent"
                : "chat-bubble-received",
            )}
          >
            <p className="text-sm leading-relaxed break-words">
              {message.content}
            </p>
          </div>

          {/* seen/ delivered */}
          {message.isOwn && message._id === selectedConvo.lastMessage?._id && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0.5 h-4 border-0",
                lastMessageStatus === "seen"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {lastMessageStatus}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
