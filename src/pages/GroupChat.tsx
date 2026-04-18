import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Send, Users, X, ArrowLeft, Mail, Sparkles, Loader2, UserPlus, Star, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Participant = { id: string; name: string; email?: string; persona?: string; color: string; kind: "person" | "celeb"; inviteToken?: string };
type GroupMsg = { id: string; speakerId: string; speakerName: string; content: string; isHost?: boolean };

const PALETTE = [
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-indigo-600",
  "from-violet-500 to-fuchsia-600",
  "from-lime-500 to-green-600",
  "from-cyan-500 to-blue-600",
  "from-red-500 to-rose-600",
];

const SUGGESTIONS = [
  { name: "Albert Einstein", persona: "Theoretical physicist, witty, philosophical" },
  { name: "Marie Curie", persona: "Pioneering chemist, precise, determined" },
  { name: "Steve Jobs", persona: "Visionary product thinker, blunt, perfectionist" },
  { name: "Taylor Swift", persona: "Pop songwriter, warm, storytelling" },
];

export default function GroupChat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<GroupMsg[]>([]);
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const addParticipant = (n: string, kind: "person" | "celeb", e?: string, p?: string, inviteToken?: string) => {
    if (!n.trim()) return false;
    if (participants.length >= 8) {
      toast({ title: "Roundtable full", description: "Max 8 seats." });
      return false;
    }
    setParticipants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: n.trim(),
        email: e?.trim() || undefined,
        persona: p?.trim() || undefined,
        color: PALETTE[prev.length % PALETTE.length],
        kind,
        inviteToken,
      },
    ]);
    return true;
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    if (participants.length >= 8) {
      toast({ title: "Roundtable full", description: "Max 8 seats." });
      return;
    }
    setInviting(true);
    let token: string | undefined;
    if (user) {
      const hostName = user.user_metadata?.display_name || user.email?.split("@")[0] || "A friend";
      const { data, error } = await supabase
        .from("roundtable_invites")
        .insert({
          host_user_id: user.id,
          host_name: hostName,
          invitee_name: name.trim(),
          invitee_email: email.trim() || null,
          persona: persona.trim() || null,
          topic: topic.trim() || null,
        })
        .select("token")
        .single();
      if (error) {
        toast({ variant: "destructive", title: "Invite failed", description: error.message });
        setInviting(false);
        return;
      }
      token = data?.token;
    }
    const ok = addParticipant(name, "person", email, persona, token);
    setInviting(false);
    if (ok) {
      setName(""); setEmail(""); setPersona("");
      if (token) {
        const link = `${window.location.origin}/join/${token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        toast({ title: "Invite link copied!", description: "Paste it in WhatsApp, iMessage, or anywhere." });
      }
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/join/${token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "Link copied" });
  };

  const removeParticipant = (id: string) => {
    setParticipants((p) => p.filter((x) => x.id !== id));
  };

  const send = async () => {
    if (!draft.trim() || isLoading) return;
    if (participants.length < 2) {
      toast({ title: "Add at least 2 participants", description: "Invite people to join the roundtable first." });
      return;
    }
    const text = draft.trim();
    setDraft("");
    const hostMsg: GroupMsg = { id: crypto.randomUUID(), speakerId: "host", speakerName: "You", content: text, isHost: true };
    const newHistory = [...messages, hostMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("group-chat", {
        body: {
          participants: participants.map(({ id, name, email, persona }) => ({ id, name, email, persona })),
          history: newHistory.map((m) => ({ speakerId: m.speakerId, speakerName: m.speakerName, content: m.content })),
          userMessage: text,
          topic: topic || undefined,
        },
      });
      if (error) throw error;
      const replies: { participantId: string; message: string }[] = data?.replies || [];
      const enriched: GroupMsg[] = replies
        .map((r) => {
          const p = participants.find((x) => x.id === r.participantId);
          if (!p) return null;
          return { id: crypto.randomUUID(), speakerId: p.id, speakerName: p.name, content: r.message };
        })
        .filter(Boolean) as GroupMsg[];
      // Stagger replies for a natural feel
      for (let i = 0; i < enriched.length; i++) {
        await new Promise((r) => setTimeout(r, 350));
        setMessages((prev) => [...prev, enriched[i]]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get replies";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const seatCount = participants.length;
  const angleStep = seatCount > 0 ? (2 * Math.PI) / seatCount : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to ShubanAI chat
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            <h1 className="font-bold text-xl tracking-tight">Roundtable</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5" /> Group AI conversations
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: invite panel */}
        <aside className="space-y-4">
          {/* People section */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-rose-200/70 p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-rose-600" />
              </div>
              <h2 className="font-semibold">People</h2>
              <span className="ml-auto text-xs text-slate-500">{participants.filter(p => p.kind === "person").length} added</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Invite real people — we'll generate a shareable link.</p>
            <div className="space-y-2">
              <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white" />
              <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="bg-white" />
              <Textarea placeholder="Role (optional) — e.g., 'Product manager'" value={persona} onChange={(e) => setPersona(e.target.value)} rows={2} className="bg-white resize-none" />
              <Button onClick={handleAdd} disabled={inviting} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:opacity-90">
                {inviting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                {inviting ? "Generating link..." : "Invite person"}
              </Button>
            </div>

            {/* Invite links list */}
            {participants.filter(p => p.kind === "person" && p.inviteToken).length > 0 && (
              <div className="mt-4 pt-4 border-t border-rose-100 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Shareable invite links</p>
                {participants.filter(p => p.kind === "person" && p.inviteToken).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-rose-50/60 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">/join/{p.inviteToken!.slice(0, 12)}...</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => copyInviteLink(p.inviteToken!)}
                    >
                      {copiedToken === p.inviteToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shuban Mode section */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-violet-200/70 p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Star className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="font-semibold">Shuban Mode</h2>
              <span className="ml-auto text-xs text-slate-500">{participants.filter(p => p.kind === "celeb").length} added</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Add famous figures, scientists, or celebrities as AI personas.</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => addParticipant(s.name, "celeb", undefined, s.persona)}
                  className="text-xs px-3 py-2 rounded-lg border border-violet-200 bg-violet-50/50 hover:bg-violet-100 text-left text-violet-900 font-medium"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5">
            <h3 className="font-semibold mb-2 text-sm">Topic (optional)</h3>
            <Input placeholder="e.g., The future of AI" value={topic} onChange={(e) => setTopic(e.target.value)} className="bg-white" />
          </div>
        </aside>

        {/* Right: roundtable + transcript */}
        <main className="space-y-6">
          {/* Roundtable visual */}
          <div className="relative bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 h-[380px] overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full max-w-md max-h-md">
                {/* Center table */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <div className="text-center text-white">
                    <Users className="h-7 w-7 mx-auto mb-1" />
                    <p className="text-xs font-semibold">{seatCount} seats</p>
                  </div>
                </div>

                {/* Seats around the circle */}
                {participants.map((p, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const radius = 140;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  return (
                    <div
                      key={p.id}
                      className="absolute left-1/2 top-1/2 group"
                      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                    >
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-bold shadow-md ring-2 ${p.kind === "celeb" ? "ring-violet-400" : "ring-rose-400"}`}>
                        {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div className={`absolute -bottom-0 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${p.kind === "celeb" ? "bg-violet-500" : "bg-rose-500"}`} title={p.kind === "celeb" ? "Shuban Mode persona" : "Invited person"}>
                        {p.kind === "celeb" ? <Star className="h-3 w-3 text-white" /> : <UserPlus className="h-3 w-3 text-white" />}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs font-medium text-slate-700 whitespace-nowrap max-w-[120px] truncate text-center">
                        {p.name}
                      </div>
                      <button
                        onClick={() => removeParticipant(p.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3 text-slate-600" />
                      </button>
                    </div>
                  );
                })}

                {seatCount === 0 && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4">
                    <p className="text-sm text-slate-400">Invite participants to fill the table</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Start the discussion — ask the table a question.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const p = participants.find((x) => x.id === m.speakerId);
                  return (
                    <div key={m.id} className={`flex gap-3 ${m.isHost ? "flex-row-reverse" : ""}`}>
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${m.isHost ? "bg-slate-800" : `bg-gradient-to-br ${p?.color || "from-slate-400 to-slate-600"}`}`}>
                        {m.isHost ? "Y" : m.speakerName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <div className={`max-w-[75%] ${m.isHost ? "items-end" : "items-start"} flex flex-col`}>
                        <span className="text-xs text-slate-500 mb-0.5 px-1">{m.speakerName}</span>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${m.isHost ? "bg-slate-900 text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pl-12">
                    <Loader2 className="h-3 w-3 animate-spin" /> Participants are responding...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-3 flex gap-2 sticky bottom-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Address the roundtable..."
              rows={1}
              className="resize-none bg-transparent border-0 focus-visible:ring-0"
            />
            <Button onClick={send} disabled={isLoading || !draft.trim()} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
