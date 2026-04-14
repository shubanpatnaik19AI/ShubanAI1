import { useState, useCallback } from "react";
import { useConversations } from "@/lib/chat-store";
import type { Attachment } from "@/lib/chat-store";
import { streamChat } from "@/lib/stream-chat";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatArea } from "@/components/ChatArea";
import { ChatInput } from "@/components/ChatInput";
import { Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { toast } = useToast();
  const {
    conversations,
    activeId,
    activeConversation,
    setActiveId,
    createConversation,
    addMessage,
    updateLastAssistantMessage,
    deleteConversation,
  } = useConversations();

  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      let convId = activeId;
      if (!convId) {
        convId = createConversation();
      }

      addMessage(convId, { role: "user", content: text, attachments });
      setIsLoading(true);

      // Add empty assistant message
      addMessage(convId, { role: "assistant", content: "" });

      let fullContent = "";

      try {
        // Build message history
        const conv = conversations.find((c) => c.id === convId);
        const history = conv
          ? [...conv.messages.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: text }]
          : [{ role: "user" as const, content: text }];

        // If there are image attachments, add them to the last user message for the AI
        if (attachments && attachments.length > 0) {
          const imageUrls = attachments.filter((a) => a.type === "image").map((a) => a.url);
          if (imageUrls.length > 0) {
            const lastMsg = history[history.length - 1];
            lastMsg.content = `${lastMsg.content}\n\n[User attached ${imageUrls.length} image(s): ${imageUrls.join(", ")}]`;
          }
        }

        await streamChat({
          messages: history,
          onDelta: (chunk) => {
            fullContent += chunk;
            updateLastAssistantMessage(convId!, fullContent);
          },
          onDone: () => setIsLoading(false),
        });
      } catch (err: any) {
        setIsLoading(false);
        updateLastAssistantMessage(convId, "Sorry, something went wrong. Please try again.");
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || "Failed to get a response",
        });
      }
    },
    [activeId, conversations, createConversation, addMessage, updateLastAssistantMessage, toast]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={createConversation}
        onDelete={deleteConversation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card/30 px-6 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shuban-glow">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg shuban-gradient-text">ShubanAI</h1>
            <p className="text-xs text-muted-foreground">Research & Knowledge Assistant</p>
          </div>
        </header>

        {/* Chat Area */}
        <ChatArea
          conversation={activeConversation}
          isLoading={isLoading}
          onSuggestion={sendMessage}
        />

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
