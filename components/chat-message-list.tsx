import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
}

export function ChatMessageList({ messages, isSending }: ChatMessageListProps) {
  if (messages.length === 0 && !isSending) {
    return (
      <p className="text-sm text-muted-foreground">
        Ask a question about this document. Answers are based only on its content.
      </p>
    );
  }

  return (
    <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            "max-w-[85%] rounded-lg px-3 py-2 text-sm break-words",
            message.role === "user"
              ? "self-end bg-primary text-primary-foreground"
              : "self-start bg-muted text-foreground"
          )}
        >
          {message.content}
        </div>
      ))}
      {isSending && (
        <div className="self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Thinking...
        </div>
      )}
    </div>
  );
}
