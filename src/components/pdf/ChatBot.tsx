
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Send, X } from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatBotProps {
  ocrText: string;
  onClose: () => void;
}

export const ChatBot = ({ ocrText, onClose }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I can answer questions about the PDF content. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    const userMessage = { role: "user" as const, content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    let loadingToastId: string | number = "";
    
    try {
      setMessages(prev => [...prev, { role: "assistant", content: "Thinking..." }]);
      
      loadingToastId = toast.loading("Processing your question...", {
        duration: 10000,
        position: "top-right"
      });
      
      const OPENROUTER_API_KEY = "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";
      const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PDF Chat Assistant',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that answers questions about PDF content in simple, clear language.
              
              Guidelines:
              1. Use simple, easy-to-understand language
              2. Format answers with bullet points when helpful
              3. Use <strong> tags for important keywords
              4. Give complete answers with all relevant information
              5. If information isn't in the PDF, mention that and provide helpful context
              6. Be supportive and encouraging
              
              Here's the PDF content: ${ocrText}`
            },
            ...messages.filter(m => m.role !== "assistant" || m.content !== "Thinking..."),
            {
              role: "user",
              content: input.trim()
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      
      setMessages(prev => prev.filter(m => m.content !== "Thinking..."));
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("OpenRouter API error:", errorData);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      
    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => prev.filter(m => m.content !== "Thinking..."));
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error while processing your question. Please try again." 
      }]);
      
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      toast.error("Failed to generate response", { duration: 3000, position: "top-right" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-white">
      {/* Header - Mobile optimized */}
      <div className="p-3 md:p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-base md:text-lg font-medium truncate">PDF Chat</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Messages - Scrollable area */}
      <div className="flex-grow overflow-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] md:max-w-[80%] rounded-lg p-3 text-sm md:text-base ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}
            >
              {message.content === "Thinking..." ? (
                <div className="flex items-center space-x-2">
                  <span>Thinking</span>
                  <span className="animate-pulse">...</span>
                </div>
              ) : (
                <div 
                  className={`${
                    message.role === 'assistant' 
                      ? 'prose prose-sm md:prose prose-headings:my-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 dark:prose-invert max-w-none' 
                      : 'text-inherit'
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: message.role === 'assistant' 
                      ? marked.parse(message.content) 
                      : message.content 
                  }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form - Mobile optimized */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t bg-white shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the PDF..."
            className="flex-grow px-3 py-2 text-sm md:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={isProcessing}
          />
          <Button 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            size="sm"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
