
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const ChatInterface = () => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ question: string; answer: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      
      console.log("Response data:", data); // Debug log
      
      // Extract the answer from the response structure
      let answer = '';
      if (data && typeof data === 'object') {
        // Check if the data has an excuse property
        if (data.excuse) {
          answer = data.excuse;
        } 
        // Check if the data has an output property
        else if (data.output) {
          answer = data.output;
        } 
        // Check if the data is an array with an output property
        else if (Array.isArray(data) && data[0] && data[0].output) {
          answer = data[0].output;
        } else {
          answer = 'Sorry, I could not understand that. Could you try asking in a different way?';
        }
      } else {
        answer = 'Sorry, I received an invalid response. Please try again.';
      }
      
      setChatHistory(prev => [...prev, { 
        question: question,
        answer: answer
      }]);
      setQuestion('');
      
      // Fixed toast call
      toast.success("Response received!", {
        description: "Your question has been answered."
      });
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => [...prev, { 
        question: question,
        answer: 'Sorry, there was an error processing your question. Please try again.'
      }]);
      
      // Fixed toast call
      toast.error("Error", {
        description: "Failed to process your question. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5DEFF] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold text-center text-[#221F26] mb-8 pt-8 flex items-center justify-center gap-3">
          <Bot className="size-12 text-[#8B5CF6] animate-pulse" />
          Coddify AI Tutor
        </h1>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <ScrollArea className="h-[500px] w-full pr-4">
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Bot className="size-16 text-[#8B5CF6] mb-4" />
                <p className="text-xl font-semibold">👋 Hi! I'm your AI Tutor</p>
                <p className="mt-2">Ask me anything about your studies!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...chatHistory].reverse().map((chat, index) => (
                  <div key={index} className="space-y-4">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-[#8B5CF6] text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
                        <p className="text-sm">{chat.question}</p>
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    <div className="flex items-start gap-2">
                      <Bot className="size-6 text-[#8B5CF6] mt-2" />
                      <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
                        <p className="text-sm whitespace-pre-wrap">{chat.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask me anything! For example: What is photosynthesis? 🌱"
              className="flex-1 p-4 text-base border rounded-full focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !question.trim()}
              className="px-6 rounded-full bg-[#8B5CF6] text-white font-semibold hover:bg-[#7E69AB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Thinking..." : "Ask! 🚀"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
