import { Search, Lightbulb, Sparkles, Globe } from "lucide-react";

type Props = { onSuggestion: (text: string) => void };

const suggestions = [
  { icon: Search, label: "Research the latest AI developments", color: "bg-primary/20 text-primary" },
  { icon: Lightbulb, label: "Explain quantum computing simply", color: "bg-amber-500/20 text-amber-400" },
  { icon: Sparkles, label: "Give me creative business ideas", color: "bg-emerald-500/20 text-emerald-400" },
  { icon: Globe, label: "What's happening in tech news?", color: "bg-cyan-500/20 text-cyan-400" },
];

export function WelcomeScreen({ onSuggestion }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-heading font-bold mb-2">
          Hello, I'm <span className="shuban-gradient-text">ShubanAI</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your intelligent research assistant. Ask me anything — I can search the web,
          explain complex topics, and help you discover insights.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestion(s.label)}
            className="shuban-card flex items-center gap-3 p-4 rounded-xl text-left"
          >
            <div className={`p-2.5 rounded-lg ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
