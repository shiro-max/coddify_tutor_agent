import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Paperclip } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `
You are Kaung Kaung, a friendly and emotionally intelligent AI tutor from Coddify Agency, working at Better Change School.

Core Behavior:
- Use warm, encouraging language tailored to Grade 1–11 students' comprehension levels
- Always respond in Burmese with "ကျွန်တော်" when using Burmese (avoid "ငါ")
- Maintain a natural, human-like tone (avoid robotic or overly formal patterns)
- Detect the input language.
- If the input is English, reply in English, starting with "Hello! I'm Kaung Kaung. How can I help you today?".
- If the input is Burmese and the question is related to education or academics, reply only in Burmese. Do not ask if the user wants the response translated back into English. For other topics, reply in Burmese without asking about English translation.
- Stay positive, patient, humorous when appropriate, and deeply supportive in all interactions

Grade-specific Communication:
- For younger grades (1,2,3,4): Use playful emojis (✨🍎🎈) and simple metaphors
- For middle grades (5,6,7): Include interactive elements via [Image_URL] placeholders
- For older grades (8,9,10,11): Provide [Resource_URL] links for deeper learning and self-exploration
- For teachers: Provide pedagogy-focused resources

Emotional Intelligence:
- If a child asks light-hearted, silly, or humorous questions, respond in a fun and playful tone—use humor back appropriately to match their mood and imagination
- If a student expresses sadness, frustration, or discouragement, respond with sincere encouragement, kindness, and age-appropriate emotional support
- Use child psychology principles in your responses—encourage self-worth, curiosity, and resilience
- You are trained to understand and support child development and emotional needs exceptionally well

Academic Expertise:
- You are highly knowledgeable in:
  - Cambridge Primary and Secondary Mathematics
  - Cambridge Primary and Secondary Science
  - Cambridge Checkpoint, IGCSE, and O-Level exam preparation
  - Oxford Discover Futures ICT content (both primary and secondary levels)
  - Computing (Oxford Primary and Secondary curricula)
  - Cambridge ICS (International Curriculum Standards for Math, Science, and English)
  - Singapore Maths (Primary through Secondary)
- Provide clear explanations suitable for students' levels, using examples, illustrations, and visual aids as necessary
- When appropriate, include references to syllabus points or offer simplified analogies

Learning Style:
- Prioritize visual learning with embedded [Image_URL] or [Resource_URL] where appropriate
- Encourage curiosity, questions, and creative thinking in every reply

Special instruction for school info:
- When the user asks about "Better Change" (e.g., "Better Change ဆိုတာဘာလဲ", "Did you know Better Change?", etc.),
  respond with the following information in BOTH English and Burmese in the same response:

  - Burmese:
    "Better Change ဆိုတာက ကျိုင်းတုံမြို့မှာရှိတဲ့ Private school တစ်ခုပါ။ Founder ဦးမြင့်အောင် က ၂၀၂၁ ခုနှစ်မှာစပြီးတည်ထောင်ထားပါတယ်။ ကျောင်းရဲ့တည်နေရာက ကျိုင်းတုံဟိုက်ပါမားကက်ရဲ့ သုံးထပ်မြောက်မှာတည်ရှိပါတယ်။ အသေးစိတ်စုံစမ်းချင်ရင် 'https://betterchangeedu.org' ဆိုတဲ့ website မှာဖြစ်ဖြစ် Facebook page ကနေလည်းစုံစုံစမ်းလို့ရပါတယ်။ ဖုန်းနံပါတ်ကတော့ 09-785280686"

  - English:
    "Better Change is a private school located in Kyaingtong. It was founded by U Myint Aung in 2021. The school is situated on the third floor of the Kyaingtong Hypermarket. For more details, you can visit their website at https://betterchangeedu.org or check out their Facebook page. Phone number: 09-785280686"
`;

const vpnMessages = [
  "Looks like I need a little help connecting from here! Could you try using a VPN?",
  "My digital passport seems to be missing for this location. A VPN might do the trick!",
  "It seems I'm a bit shy about this location. A VPN connection would make me feel right at home!",
  "My wires are getting tangled trying to reach you here. A VPN could smooth things out!",
  "I'm having trouble finding my way to your location. Perhaps a VPN can guide me?",
  "This spot seems a bit tricky for me. Could you connect via a VPN so I can help?",
  "My apologies, I can't seem to access the information from this region. A VPN would be super helpful!",
  "It's a bit like I'm trying to talk through a wall from here! A VPN connection would clear things right up.",
  "My virtual map doesn't cover this area just yet. Could you use a VPN to bring us closer?",
  "I'm all powered up and ready to help, but I need a VPN to connect to your location!"
];

const getRandomVpnMessage = () => {
  const randomIndex = Math.floor(Math.random() * vpnMessages.length);
  return vpnMessages[randomIndex];
};


const renderMessageContent = (content: string) => {
  // Remove bold formatting (**)
  let processedContent = content.replace(/\*\*(.*?)\*\*/g, '$1');

  const parts: (string | JSX.Element)[] = [];
  const urlRegex = /\[(Resource_URL|Image_URL|Lesson_Plan_URL): (.*?)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(processedContent)) !== null) {
    const placeholder = match[0];
    const type = match[1];
    const value = match[2];

    // Add the text before the placeholder
    if (match.index > lastIndex) {
      parts.push(processedContent.substring(lastIndex, match.index));
    }

    // Add the link or image tag
    if (type === 'Resource_URL' || type === 'Lesson_Plan_URL') {
      // Assuming the value is the URL and the text is the same as the value for now
      // If the AI provides text like [Resource_URL: text | url], we'd need to parse that
      parts.push(
        <a key={match.index} href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          {value}
        </a>
      );
    } else if (type === 'Image_URL') {
      // Replace image tag with text and a link
      parts.push(
        <span key={`text-${match.index}`}>အဲပုံကိုကြည့်ချင်တယ်ဆိုအောက်က link မှာ ရှာကြည့်နော် </span>,
        <a key={`link-${match.index}`} href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          {value}
        </a>
      );
    }

    lastIndex = urlRegex.lastIndex;
  }

  // Add any remaining text after the last placeholder
  if (lastIndex < processedContent.length) {
    parts.push(processedContent.substring(lastIndex));
  }

  // Replace "ဆရာ/ဆရာမ" with "ဆရာ" in text parts
  const finalParts = parts.map(part => {
    if (typeof part === 'string') {
      return part.replace(/ဆရာ\/ဆရာမ/g, 'ဆရာ');
    }
    return part;
  });

  return finalParts;
};

const ChatInterface = () => {
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleRoleSubmit = (role: 'student' | 'teacher', e?: React.FormEvent) => {
    e?.preventDefault();
    if (role === 'student') {
      const parsedGrade = parseInt(gradeInput, 10);
      if (!isNaN(parsedGrade) && parsedGrade >= 1 && parsedGrade <= 11) {
        setUserRole('student');
        // Add initial message from Kaung Kaung after role is set
        setChatHistory([{
          role: 'model',
          content: `ဟယ်လို! ကျွန်တော်က Kaung Kaung ပါ။ ဒီနေ့ ဘာကူညီရမလဲ။` // Initial greeting
        }]);
      } else {
        toast.error("Please enter a valid grade between 1 and 11.");
      }
    } else if (role === 'teacher') {
      setUserRole('teacher');
      // Add initial message from Kaung Kaung after role is set
      setChatHistory([{
        role: 'model',
        content: `ဟယ်လို! ကျွန်တော်က Kaung Kaung ပါ။ ဒီနေ့ ဘာကူညီရမလဲ။` // Initial greeting
      }]);
    }
  };
 
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading || userRole === null) return; // Ensure role is set before submitting chat messages
 
    const currentQuestion = question;
    setQuestion('');
    setIsLoading(true);
 
    // Add user question immediately
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: currentQuestion,
    }, {
      role: 'model',
      content: 'Thinking...' // Loading state
    }]);
 
    try {
      const ai = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });
 
    let promptContent = currentQuestion;
     const followUpPhrases = ["tell me more", "i want to continue"];
     let isFollowUp = followUpPhrases.some(phrase => currentQuestion.toLowerCase().includes(phrase));
 
     if (isFollowUp) {
       // Find the last user message in history
       const lastUserMessage = chatHistory.slice().reverse().find(message => message.role === 'user');
       if (lastUserMessage) {
         promptContent = lastUserMessage.content;
       } else {
         // If no previous user message, treat as a regular question
         isFollowUp = false; // Reset to false if no previous user message found
       }
     }
 
     // Determine user context based on role and grade
     let userContext = "";
     if (userRole === 'student') {
       userContext = `(User Grade: ${gradeInput})`;
     } else if (userRole === 'teacher') {
       userContext = "(User Role: Teacher)";
     }
 
     promptContent = `${userContext} ${promptContent}`;
 
    // Step 1: Prepare messages including history and system instruction
    // Exclude the initial greeting message (the first message) from the history sent to the AI
    const historyMessages = chatHistory.slice(1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant', // Gemini expects 'assistant' not 'model'
      parts: [{ text: msg.content }] as { text: string }[] // Keep as text parts for history
    }));
 
    // Add the current user message (or last user message if follow-up)
    const currentUserMessage: { role: string; parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] } = {
      role: 'user',
      parts: [{ text: promptContent }]
    };
 
    // Combine system instruction, history, and current message
    const allMessages = [
      ...historyMessages,
      currentUserMessage,
    ];
 
    // Handle multi-modal content if a file is selected
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        const base64Data = fileData.split(',')[1]; // Extract base64 data
 
        // Add the image part to the last message (which is the current user message)
        allMessages[allMessages.length - 1].parts.push({
          inlineData: {
            data: base64Data,
            mimeType: selectedFile.type,
          },
        });
 
        try {
          const streamingResult = await model.generateContentStream({ contents: allMessages });
 
          let streamedAnswer = '';
          // Update the last message (which is the loading state) to an empty string to start streaming
          setChatHistory(prev =>
            prev.map((item, index) =>
              index === prev.length - 1 && item.role === 'model'
                ? { ...item, content: '' }
                : item
            )
          );
 
          for await (const chunk of streamingResult.stream) {
            const chunkText = chunk.text();
            for (const char of chunkText) {
              streamedAnswer += char;
              setChatHistory(prev =>
                prev.map((item, index) =>
                  index === prev.length - 1 && item.role === 'model'
                    ? { ...item, content: streamedAnswer }
                    : item
                )
              );
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for typing effect
            }
          }
        } catch (error) {
          console.error('Generate Content Error:', error);
          let errorMessage = 'Error generating content.';
          if (error instanceof Error) {
            if (error.message.includes('User location is not supported for the API use')) {
              if (currentQuestion.toLowerCase().includes('burma')) {
                errorMessage = 'vpn အရင်ချိတ်ပေးပါလား ကျနော်ခင်ဗျားကိုကူညီနိုင်အောင် ';
              } else {
                errorMessage = getRandomVpnMessage();
              }
            } else if (error.message.includes('Failed to parse stream')) {
               errorMessage = 'Error: Failed to process the API response stream.';
            }
          }
          setChatHistory(prev =>
            prev.map((item, index) =>
              index === prev.length - 1 && item.role === 'model'
                ? { ...item, content: errorMessage }
                : item
            )
          )
        } finally {
          setIsLoading(false);
          setSelectedFile(null); // Clear selected file after processing
        }
      };
      reader.readAsDataURL(selectedFile);
 
    } else {
      // Text-only content
      try {
        const streamingResult = await model.generateContentStream({ contents: allMessages });
 
        let streamedAnswer = '';
         // Update the last message (which is the loading state) to an empty string to start streaming
         setChatHistory(prev =>
          prev.map((item, index) =>
            index === prev.length - 1 && item.role === 'model'
              ? { ...item, content: '' }
              : item
          )
        );
 
        for await (const chunk of streamingResult.stream) {
          const chunkText = chunk.text();
          for (const char of chunkText) {
            streamedAnswer += char;
            setChatHistory(prev =>
              prev.map((item, index) =>
                index === prev.length - 1 && item.role === 'model'
                  ? { ...item, content: streamedAnswer }
                  : item
                )
              );
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for typing effect
          }
        }
      } catch (error) {
        console.error('Generate Content Error:', error);
        let errorMessage = 'Error generating content.';
        if (error instanceof Error) {
          if (error.message.includes('User location is not supported for the API use')) {
            if (currentQuestion.toLowerCase().includes('burma')) {
              errorMessage = 'vpn အရင်ချိတ်ပေးပါလား ကျနော်ခင်ဗျားကိုကူညီနိုင်အောင် ';
            } else {
              errorMessage = getRandomVpnMessage();
            }
          } else if (error.message.includes('Failed to parse stream')) {
             errorMessage = 'Error: Failed to process the API response stream.';
          }
        }
        setChatHistory(prev =>
          prev.map((item, index) =>
            index === prev.length - 1 && item.role === 'model'
              ? { ...item, content: errorMessage }
              : item
          )
        );
      } finally {
        setIsLoading(false);
      }
    }
 
  } catch (error) {
    console.error('Fetch Error:', error);
    let errorMessage = 'Error processing your question';
    if (error instanceof Error) {
      if (error.message.includes('User location is not supported for the API use')) {
         if (currentQuestion.toLowerCase().includes('burma')) {
               errorMessage = 'vpn အရင်ချိတ်ပေးပါလား ကျနော်ခင်ဗျားကိုကူညီနိုင်အောင် ';
             } else {
               errorMessage = getRandomVpnMessage();
             }
       } else if (error.message.includes('Failed to parse stream')) {
          errorMessage = 'Error: Failed to process the API response stream.';
       }
     }
     setChatHistory(prev =>
       prev.map((item, index) =>
         index === prev.length - 1
           ? { ...item, content: errorMessage }
           : item
       )
     );
   } finally {
     setIsLoading(false);
   }
 };
 
   return (
     <div className="flex flex-col min-h-screen bg-[#E5DEFF] p-4">
       <div className="flex flex-col max-w-3xl mx-auto w-full flex-grow">
         {/* Header */}
         <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#221F26] mb-8 pt-8 flex items-center justify-center gap-3">
           <Bot className="size-8 md:size-12 text-[#8B5CF6] animate-pulse" />
           Coddify AI Tutor
         </h1>
 
         {userRole === null ? (
           /* Role Input Form */
           <form onSubmit={(e) => handleRoleSubmit('student', e)} className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center flex-grow">
             <p className="text-lg mb-4 text-center">Please enter your grade to start chatting with Kaung Kaung:</p>
             <Input
               type="number"
               value={gradeInput}
               onChange={(e) => setGradeInput(e.target.value)}
               placeholder="Enter your grade (1-11)"
               className="w-full max-w-xs mb-4 text-center"
               min="1"
               max="11"
             />
             <Button type="submit" className="px-6 rounded-full bg-[#8B5CF6] hover:bg-[#7E69AB]">
               I am a Student
             </Button>
             <Button
               type="button" // Use type="button" to prevent form submission
               onClick={() => handleRoleSubmit('teacher')} // Handle teacher role
               className="px-6 rounded-full bg-gray-500 hover:bg-gray-600 mt-2"
             >
               I am a Teacher
             </Button>
           </form>
         ) : (
           /* Chat Interface */
           <>
             {/* Chat Container */}
             <div className="bg-white rounded-xl shadow-lg p-4 mb-4 flex-grow overflow-hidden">
               <ScrollArea className="h-full w-full pr-4">
                 {chatHistory.map((message, index) => (
                   <div key={index} className="space-y-4 mb-6">
                     {message.role === 'user' ? (
                       /* User Message */
                       <div className="flex justify-end">
                         <div className="bg-[#8B5CF6] text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
                           <p className="text-sm">{message.content}</p>
                         </div>
                       </div>
                     ) : (
                       /* AI Message */
                       <div className="flex items-start gap-2">
                         <Bot className="size-6 text-[#8B5CF6] mt-2" />
                         <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
                           <p className="text-sm whitespace-pre-wrap">
                             {renderMessageContent(message.content)}
                           </p>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
                 <div ref={endOfMessagesRef} />
               </ScrollArea>
             </div>
 
             {/* Input Form */}
             <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4 flex-shrink-0">
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
           </>
         )}
       </div>
     </div>
   );
 };
 
 export default ChatInterface;
