import { MessageSquare, Plus, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="w-72 h-screen flex flex-col border-r border-border bg-card/50">
      <div className="p-4 border-b border-border">
        <h2 className="font-heading text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Chat History
        </h2>
        <Button onClick={onNew} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left p-3 rounded-lg transition-all group flex items-start gap-3 ${
                conv.id === activeId
                  ? "bg-primary/15 border border-primary/30"
                  : "hover:bg-secondary border border-transparent"
              }`}
            >
              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{conv.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(conv.updatedAt, "MMM d, h:mm a")}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
