import { useChatStore } from "@/stores/useChatStore";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MessageItem from "./MessageItem";
import InfiniteScroll from "react-infinite-scroll-component";

const ChatWindowBody = () => {
  const {
    activeConversationId,
    conversations,
    messages: allMessages,
    fetchMessages,
    messageLoading,
  } = useChatStore();

  const [lastMessageStatus, setLastMessageStatus] = useState<
    "delivered" | "seen"
  >("delivered");

  const messages = allMessages[activeConversationId!]?.items ?? []; // lấy hết message của convo đang dc active
  const hasMore = allMessages[activeConversationId!]?.hasMore ?? false;
  const reversedMessages = [...messages].reverse();
  const selectedConvo = conversations.find(
    (c) => c._id === activeConversationId,
  );
  const key = `chat-scroll-${activeConversationId}`; // key để lưu vị trí scroll trong session


  // ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // seen status
  useEffect(() => {
    const lastMessage = selectedConvo?.lastMessage;
    if (!lastMessage) {
      return;
    }

    const seenBy = selectedConvo?.seenBy ?? [];

    setLastMessageStatus(seenBy.length > 0 ? "seen" : "delivered");
  }, [selectedConvo]);

  // // load tin nhắn lần đầu khi vừa mở conversation
  // useEffect(() => {
  //   if (!activeConversationId) {
  //     return;
  //   }

  //   const current = allMessages[activeConversationId];
  //   if (current?.items?.length) {
  //     return;
  //   }

  //   void fetchMessages(activeConversationId);
  // }, [activeConversationId, allMessages, fetchMessages]);
  // -> tin nhắn đã được fetch lần đầu khi vừa mở conversation thông qua infinite scroll

  // // đưa viewport về cuối khi đổi conversation hoặc có tin mới
  // useLayoutEffect(() => {
  //   if (!containerRef.current) return;
  //   containerRef.current.scrollTop = containerRef.current.scrollHeight;
  // }, [activeConversationId, messages.length]);

  // đưa viewPort về cuối khi đổi convo hoặc có tin mới
  useLayoutEffect(() => {
    if (!messagesEndRef.current) return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversationId, messages.length]);

  const fetchMoreMessages = async () => {
    if (!activeConversationId || !hasMore || messageLoading) {
      return;
    }

    try {
      await fetchMessages(activeConversationId);
    } catch (error) {
      console.error("Lỗi xảy ra khi fetch thêm tin", error);
    }
  };

  // lưu scroll position để khi reload page vẫn giữ được vị trí scroll
  const handleScrollSave = () => {
    const container = containerRef.current;
    if (!container || !activeConversationId) {
      return;
    }

    sessionStorage.setItem(
      key,
      JSON.stringify({
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      })
    );
  };

  // đưa về đúng vị trí scroll position đã lưu ở hàm trên nếu có reload 
  // -> vì khi ta tải thêm message -> reload -> việc sử dụng 2 hàm này giúp 
  // -> lưu vị trí khi tải thêm tin nhắn và tự động nhảy lại vị trí đó khi component bị reload vì fetch thêm messages
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const item = sessionStorage.getItem(key);

    if (item) {
      const { scrollTop } = JSON.parse(item);
      requestAnimationFrame(() => {
        container.scrollTop = scrollTop;
      });
    }
  }, [messages.length]);



  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }

  if (!messages?.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground ">
        Chưa có tin nhắn nào trong cuộc trò chuyện này.
      </div>
    );
  }

  return (
    <div className="p-4 bg-primary-foreground h-full flex flex-col overflow-hidden">
      <div
        id="scrollableDiv"
        ref={containerRef}
        onScroll={handleScrollSave}
        className="flex flex-col-reverse overflow-y-auto overflow-x-hidden beautiful-scrollbar"
      >
        <div ref={messagesEndRef}></div>
        <InfiniteScroll
          dataLength={reversedMessages.length}
          next={() => {fetchMoreMessages()}}
          hasMore={hasMore}
          scrollableTarget="scrollableDiv"
          inverse={true} // kích hoạt infinite scroll khi kéo lên
          loader={
            <div className="py-2 text-center text-xs text-muted-foreground">
              Đang tải...
            </div>
          }
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            overflow: "visible",
          }}
        >
          {reversedMessages.map((message, index) => (
            <MessageItem
              key={message._id ?? index}
              message={message}
              index={index}
              messages={reversedMessages}
              selectedConvo={selectedConvo}
              lastMessageStatus={lastMessageStatus}
            />
          ))}
        </InfiniteScroll>
        {messageLoading && hasMore && !reversedMessages.length && (
          <div className="py-2 text-center text-xs text-muted-foreground">
            Đang tải...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindowBody;
