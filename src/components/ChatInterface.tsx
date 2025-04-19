import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const ChatInterface = () => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ question: string; answer: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQuestion = question;
    setQuestion('');
    setIsLoading(true);

    // Add user question immediately
    setChatHistory(prev => [...prev, { 
      question: currentQuestion,
      answer: '...' // Loading state
    }]);

    try {
      const response = await fetch(import.meta.env.VITE_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      console.log('API Response:', data); // Debug log

      // Extract answer properly
      const answer = (
        data?.output ||
        data?.excuse ||
        (Array.isArray(data) && data[0]?.output) ||
        'Sorry, I could not understand that question.'
      );

      setChatHistory(prev => 
        prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, answer } 
            : item
        )
      );

    } catch (error) {
      console.error('Fetch Error:', error);
      setChatHistory(prev => 
        prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, answer: 'Error processing your question' } 
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5DEFF] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#221F26] mb-8 pt-8 flex items-center justify-center gap-3">
          <Bot className="size-8 md:size-12 text-[#8B5CF6] animate-pulse" />
          Coddify AI Tutor
        </h1>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <ScrollArea className="h-[500px] w-full pr-4">
            {chatHistory.map((chat, index) => (
              <div key={index} className="space-y-4 mb-6">
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="bg-[#8B5CF6] text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{chat.question}</p>
                  </div>
                </div>

                {/* AI Answer */}
                <div className="flex items-start gap-2">
                  <Bot className="size-6 text-[#8B5CF6] mt-2" />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">
                      {chat.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={endOfMessagesRef} />
          </ScrollArea>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask me anything 🌱"
              className="flex-1 p-4 text-base rounded-full"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="px-6 rounded-full bg-[#8B5CF6] hover:bg-[#7E69AB]"
            >
              {isLoading ? "Thinking..." : "Ask!"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;