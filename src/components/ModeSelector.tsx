import { Brain, MessageCircle, Search, GraduationCap, Sparkles } from "lucide-react";

export type ChatMode = "conversation" | "deep-thinking" | "research" | "study" | "shuban";

type ModeOption = {
  id: ChatMode;
  label: string;
  icon: React.ElementType;
  description: string;
};

export const MODES: ModeOption[] = [
  { id: "conversation", label: "Conversation", icon: MessageCircle, description: "Casual, helpful chat" },
  { id: "deep-thinking", label: "Deep Thinking", icon: Brain, description: "Complex reasoning & analysis" },
  { id: "research", label: "Research", icon: Search, description: "In-depth research & sources" },
  { id: "study", label: "Study", icon: GraduationCap, description: "Learning & explanations" },
  { id: "shuban", label: "Shuban Mode", icon: Sparkles, description: "Talk with any famous person" },
];

type Props = {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
};

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
