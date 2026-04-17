import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Film, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "@/lib/chat-store";

type Props = {
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES].join(",");

function getFileType(mime: string): "image" | "video" | "document" {
  if (IMAGE_TYPES.includes(mime)) return "image";
  if (VIDEO_TYPES.includes(mime)) return "video";
  return "document";
}

function getDocLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
    ppt: "PowerPoint",
    pptx: "PowerPoint",
    xls: "Excel",
    xlsx: "Excel",
    csv: "CSV",
    txt: "Text",
  };
  return map[ext] || "File";
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("Not signed in");
      setUploading(false);
      return;
    }
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const type = getFileType(file.type);
      if (type === "document" && !DOC_TYPES.includes(file.type)) continue;

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("chat-media").upload(path, file);
      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      // Bucket is private — generate a long-lived signed URL for display
      const { data: signed } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

      newAttachments.push({
        id: crypto.randomUUID(),
        url: signed?.signedUrl ?? "",
        type,
        name: file.name,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || disabled || uploading) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
  };

  return (
    <div className="border-t border-border bg-card/30 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachments.map((att) => (
              <div key={att.id} className="relative group rounded-lg overflow-hidden border border-border bg-secondary/50">
                {att.type === "image" ? (
                  <img src={att.url} alt={att.name} className="w-20 h-20 object-cover" />
                ) : att.type === "video" ? (
                  <div className="w-20 h-20 flex items-center justify-center bg-secondary">
                    <Film className="h-8 w-8 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-20 h-20 flex flex-col items-center justify-center bg-secondary gap-1 px-1">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">{getDocLabel(att.name)}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-secondary/50 rounded-xl border border-border p-2 focus-within:border-primary/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            placeholder="Ask me anything... Attach images, videos, documents, or presentations."
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[40px] max-h-[160px] p-2"
            rows={1}
            disabled={disabled}
          />
          <Button
            onClick={handleSubmit}
            disabled={(!input.trim() && attachments.length === 0) || disabled || uploading}
            size="sm"
            className="shrink-0 gap-1.5 rounded-lg"
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {uploading ? "Uploading..." : "ShubanAI can make mistakes. Verify important information."}
        </p>
      </div>
    </div>
  );
}
