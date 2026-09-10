import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AiCoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/v1/chat/",
        { message: userMessage },
        { withCredentials: true }
      );
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.reply },
      ]);
    } catch (err) {
      toast.error("Failed to connect to AI Coach");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground mb-2">AI Coach</h1>
        <p className="font-sans text-muted-foreground">Ask questions about your performance, progress, and feedback.</p>
      </div>

      <div className="flex-1 bg-card border border-border rounded-[1rem] shadow-sm flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-20">
                <Bot className="w-16 h-16 text-primary" />
                <p className="font-sans text-lg">Hello! Ask me about your communication progress.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-4 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border",
                  msg.role === "user" ? "bg-accent/20 border-accent/30 text-accent" : "bg-primary/20 border-primary/30 text-primary"
                )}>
                  {msg.role === "user" ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div
                  className={cn(
                    "p-4 rounded-[1rem] font-sans leading-relaxed whitespace-pre-wrap",
                    msg.role === "user" 
                      ? "bg-accent text-accent-foreground rounded-tr-sm" 
                      : "bg-secondary text-secondary-foreground rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-4 max-w-[85%]">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border bg-primary/20 border-primary/30 text-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 rounded-[1rem] rounded-tl-sm bg-secondary text-secondary-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background">
          <form onSubmit={sendMessage} className="flex gap-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your communication scores..."
              disabled={loading}
              className="flex-1 bg-card border-border font-sans h-12"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="h-12 px-6">
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
