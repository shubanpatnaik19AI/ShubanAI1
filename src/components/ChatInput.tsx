import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="border-t border-border bg-card/30 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-secondary/50 rounded-xl border border-border p-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            placeholder="Ask me anything... I can help with research, questions, explanations..."
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[40px] max-h-[160px] p-2"
            rows={1}
            disabled={disabled}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            size="sm"
            className="shrink-0 gap-1.5 rounded-lg"
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          ShubanAI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
