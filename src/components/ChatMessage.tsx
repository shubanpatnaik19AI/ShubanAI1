import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Film } from "lucide-react";
import type { Message } from "@/lib/chat-store";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary/60 text-foreground rounded-bl-md"
        }`}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att) =>
              att.type === "image" ? (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.name}
                  className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer"
                  onClick={() => window.open(att.url, "_blank")}
                />
              ) : (
                <video
                  key={att.id}
                  src={att.url}
                  controls
                  className="max-w-full rounded-lg max-h-64"
                />
              )
            )}
          </div>
        )}

        {isUser ? (
          message.content ? <p className="text-sm">{message.content}</p> : null
        ) : (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/30 flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
