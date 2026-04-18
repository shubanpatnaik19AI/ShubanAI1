
CREATE TABLE public.roundtable_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  host_user_id uuid NOT NULL,
  host_name text,
  invitee_name text NOT NULL,
  invitee_email text,
  persona text,
  topic text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone
);

CREATE INDEX idx_roundtable_invites_token ON public.roundtable_invites(token);
CREATE INDEX idx_roundtable_invites_host ON public.roundtable_invites(host_user_id);

ALTER TABLE public.roundtable_invites ENABLE ROW LEVEL SECURITY;

-- Hosts can manage their own invites
CREATE POLICY "Hosts can view their own invites"
  ON public.roundtable_invites FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can create invites"
  ON public.roundtable_invites FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own invites"
  ON public.roundtable_invites FOR UPDATE
  USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own invites"
  ON public.roundtable_invites FOR DELETE
  USING (auth.uid() = host_user_id);

-- Anyone with the token can view the invite (public lookup by token via SECURITY DEFINER function)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  token text,
  host_name text,
  invitee_name text,
  persona text,
  topic text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, token, host_name, invitee_name, persona, topic, status, created_at
  FROM public.roundtable_invites
  WHERE token = _token
  LIMIT 1;
$$;

-- Allow joiners to mark invite as joined via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.mark_invite_joined(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.roundtable_invites
  SET status = 'joined', joined_at = now()
  WHERE token = _token AND status = 'pending';
  RETURN FOUND;
END;
$$;
