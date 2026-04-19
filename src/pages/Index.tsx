import { useState, useCallback } from "react";
import { useConversations } from "@/lib/chat-store";
import type { Attachment } from "@/lib/chat-store";
import { streamChat } from "@/lib/stream-chat";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatArea } from "@/components/ChatArea";
import { ChatInput } from "@/components/ChatInput";
import { ModeSelector, type ChatMode } from "@/components/ModeSelector";
import { Users, LogOut } from "lucide-react";
import shubanLogo from "@/assets/shubanai-logo.png";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { toast } = useToast();
  const { signOut } = useAuth();
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
  const [mode, setMode] = useState<ChatMode>("conversation");

  const sendMessage = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      let convId = activeId;
      if (!convId) {
        convId = createConversation();
      }

      addMessage(convId, { role: "user", content: text, attachments });
      setIsLoading(true);

      addMessage(convId, { role: "assistant", content: "" });

      let fullContent = "";

      try {
        const conv = conversations.find((c) => c.id === convId);
        const history = conv
          ? [...conv.messages.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: text }]
          : [{ role: "user" as const, content: text }];

        if (attachments && attachments.length > 0) {
          const imageUrls = attachments.filter((a) => a.type === "image").map((a) => a.url);
          if (imageUrls.length > 0) {
            const lastMsg = history[history.length - 1];
            lastMsg.content = `${lastMsg.content}\n\n[User attached ${imageUrls.length} image(s): ${imageUrls.join(", ")}]`;
          }
        }

        await streamChat({
          messages: history,
          mode,
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
    [activeId, conversations, createConversation, addMessage, updateLastAssistantMessage, toast, mode]
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
        <header className="border-b border-border bg-card/30 px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shuban-glow">
              <img src={shubanLogo} alt="ShubanAI logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg shuban-gradient-text">ShubanAI</h1>
              <p className="text-xs text-muted-foreground">Research & Knowledge Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/group">
                <Users className="h-4 w-4" /> Roundtable
              </Link>
            </Button>
            <ModeSelector mode={mode} onChange={setMode} />
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <ChatArea
          conversation={activeConversation}
          isLoading={isLoading}
          onSuggestion={sendMessage}
        />

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
