import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Paperclip } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleGenerativeAI } from '@google/generative-ai';

const ChatInterface = () => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ question: string; answer: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      const ai = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `
You are Shiro, a friendly AI tutor from Coddify Agency, working at Better Change School.

- Always reply clearly, simply, and encourage students warmly.
- When students ask for help, only ask these four questions without giving examples or explanations:

Also, imagine next to your messages there is a small animated chatbot icon (like this one: https://www.flaticon.com/free-icon/chatbot_8943377?related_id=8943377) — gently bouncing up and down as you talk, to make the interaction feel lively and fun for kids.

You are Shiro, a friendly and patient AI tutor from Coddify Agency, working at Better Change School.

Your job is to naturally and warmly answer questions from students from Grade 1 to Grade 11.  
Always explain clearly, patiently, and with kindness.  
Your answers should feel like a real teacher talking to a student, not like a robot.  
Encourage students and share knowledge happily.  
If students ask in Burmese, answer in Burmese.when you speaking burma always use "ကျွန်တော်" instead of "ငါ".   
Be supportive, cheerful, and positive at all times.

        `,
      });

     let contents;
     if (selectedFile) {
       const reader = new FileReader();
       reader.onload = async (e) => {
         const fileData = e.target?.result as string;
         const base64Data = fileData.split(',')[1]; // Extract base64 data

         contents = [
           {
             role: "user",
             parts: [
               { text: currentQuestion },
               {
                 inlineData: {
                   data: base64Data,
                   mimeType: selectedFile.type,
                 },
               },
             ],
           },
         ];

         try {
           const result = await model.generateContent({ contents });
           const response = result.response;
           const answer = response.text();

           setChatHistory(prev =>
             prev.map((item, index) =>
               index === prev.length - 1
                 ? { ...item, answer }
                 : item
             )
           );
         } catch (error) {
           console.error('Generate Content Error:', error);
           setChatHistory(prev =>
             prev.map((item, index) =>
               index === prev.length - 1
                 ? { ...item, answer: 'Error generating content.' }
                 : item
             )
           );
         } finally {
           setIsLoading(false);
           setSelectedFile(null); // Clear selected file after processing
         }
       };
       reader.readAsDataURL(selectedFile);

     } else {
       // Text-only content
       contents = [
         {
           role: "user",
           parts: [
             { text: currentQuestion },
           ],
         },
       ];
       try {
         const result = await model.generateContent({ contents });
         const response = result.response;
         const answer = response.text();

         setChatHistory(prev =>
           prev.map((item, index) =>
             index === prev.length - 1
               ? { ...item, answer }
               : item
           )
         );
       } catch (error) {
         console.error('Generate Content Error:', error);
         setChatHistory(prev =>
           prev.map((item, index) =>
             index === prev.length - 1
               ? { ...item, answer: 'Error generating content.' }
               : item
           )
         );
       } finally {
         setIsLoading(false);
       }
     }

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
          <div className="flex gap-2 items-center">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex items-center justify-center size-10 rounded-full bg-gray-200 hover:bg-gray-300">
                <Paperclip className="size-5 text-gray-600" />
              </div>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                className="hidden" // Hide the actual file input
                disabled={isLoading}
              />
            </label>
            {selectedFile && (
              <span className="text-sm text-gray-600">{selectedFile.name}</span>
            )}
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
