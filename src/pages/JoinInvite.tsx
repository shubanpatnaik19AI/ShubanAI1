import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Users, Sparkles, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Invite = {
  id: string;
  token: string;
  host_name: string | null;
  invitee_name: string;
  persona: string | null;
  topic: string | null;
  status: string;
  created_at: string;
};

export default function JoinInvite() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Invalid invite link.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_invite_by_token", { _token: token });
      if (error || !data || data.length === 0) {
        setError("This invite link is invalid or has expired.");
      } else {
        setInvite(data[0] as Invite);
        if ((data[0] as Invite).status === "joined") setJoined(true);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    const { error } = await supabase.rpc("mark_invite_joined", { _token: token });
    setJoining(false);
    if (!error) setJoined(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100 text-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
          <Users className="h-8 w-8 text-white" />
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading your invite...</p>
          </div>
        ) : error ? (
          <>
            <h1 className="text-xl font-bold mb-2">Invite not found</h1>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <Link to="/">
              <Button variant="outline">Go home</Button>
            </Link>
          </>
        ) : invite ? (
          <>
            <p className="text-xs text-violet-600 font-medium mb-1 flex items-center justify-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> ShubanAI Roundtable
            </p>
            <h1 className="text-2xl font-bold mb-2">
              {invite.host_name ? `${invite.host_name} invited you` : "You're invited"}
            </h1>
            <p className="text-sm text-slate-600 mb-1">
              Hi <span className="font-semibold">{invite.invitee_name}</span> — you've been invited to join a group AI roundtable discussion.
            </p>
            {invite.topic && (
              <p className="text-sm text-slate-500 mb-4">
                Topic: <span className="italic">"{invite.topic}"</span>
              </p>
            )}
            {invite.persona && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4 text-slate-600">
                Your role: {invite.persona}
              </div>
            )}

            {joined ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  You've joined the roundtable!
                </div>
                <p className="text-xs text-slate-500">
                  The host has been notified. To participate in chat, sign up for ShubanAI.
                </p>
                <Link to="/auth">
                  <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90">
                    Sign up to chat <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 mt-2"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept invite"}
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
