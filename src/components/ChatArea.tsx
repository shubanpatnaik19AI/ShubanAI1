import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { Conversation } from "@/lib/chat-store";
import { ChatMessage } from "./ChatMessage";
import { WelcomeScreen } from "./WelcomeScreen";

type Props = {
  conversation: Conversation | null;
  isLoading: boolean;
  onSuggestion: (text: string) => void;
};

export function ChatArea({ conversation, isLoading, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  if (!conversation || conversation.messages.length === 0) {
    return <WelcomeScreen onSuggestion={onSuggestion} />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
        {conversation.messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && conversation.messages[conversation.messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
            <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse-glow" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse-glow [animation-delay:0.3s]" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse-glow [animation-delay:0.6s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
