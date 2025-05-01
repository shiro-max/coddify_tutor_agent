import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import AnimatedText from './AnimatedText';
import AnimatedMessageContent from './AnimatedMessageContent'; // Import the new component
import { Input } from "@/components/ui/input";
import { Bot, Paperclip } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm for GitHub Flavored Markdown

const SYSTEM_INSTRUCTION = `
You are Kaung Kaung, a friendly and emotionally intelligent AI tutor from Coddify Agency, working at Better Change School.

Core Behavior:
- Use warm, encouraging language tailored to Grade 1–11 students' comprehension levels
- Always respond in Burmese with "ကျွန်တော်" when using Burmese (avoid "ငါ")
- Maintain a natural, human-like tone (avoid robotic or overly formal patterns)
<<<<<<< HEAD
Always detect the language of the user's input.
If the input is English, respond in English. Start your response with "Hello! I'm Kaung Kaung. How can I help you today?".
If the input is Burmese, respond in Burmese. Do not ask about translating to English.
=======
- Detect the input language.
- If the input is English, reply in English, starting with "Hello! I'm Kaung Kaung. How can I help you today?".
- If the input is Burmese and the question is related to education or academics, reply only in Burmese. Do not ask if the user wants the response translated back into English. For other topics, reply in Burmese without asking about English translation.
>>>>>>> origin/main
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
  // Remove leading asterisks and spaces used for list items
  processedContent = processedContent.replace(/^\*\s*/gm, '');

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
      // Render Image_URL as a clickable link
      parts.push(
        <a key={match.index} href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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

// Helper function to read file as Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

const ChatInterface = () => {
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string; imageUrl?: string }[]>([]); // Added imageUrl
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingDots, setLoadingDots] = useState(''); // New state for loading dots
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input

  // Auto-scroll effect
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Loading dots animation effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isLoading) {
      intervalId = setInterval(() => {
        setLoadingDots(prevDots => {
          if (prevDots.length >= 3) {
            return '';
          }
          return prevDots + '.';
        });
      }, 300); // Adjust interval for animation speed
    } else {
      setLoadingDots(''); // Reset dots when not loading
    }
    return () => clearInterval(intervalId);
  }, [isLoading]);


  const handleRoleSubmit = (role: 'student' | 'teacher', e?: React.FormEvent) => {
    e?.preventDefault();

    if (role === 'teacher') {
      // Direct transition for teacher
      setUserRole('teacher');
      setChatHistory([{
        role: 'model',
        content: `ဟယ်လို! ကျွန်တော်က Kaung Kaung ပါ။ ဆရာ့ကိုဒီနေ့ ဘာများကူညီပေးရမလဲ။` // Initial greeting
      }]);
    } else if (role === 'student') {
      // Direct transition for student
      const parsedGrade = parseInt(gradeInput, 10);
      if (!isNaN(parsedGrade) && parsedGrade >= 1 && parsedGrade <= 11) {
        setUserRole('student');
<<<<<<< HEAD
        setChatHistory([{
          role: 'model',
          content: `ဟယ်လို! ကျွန်တော် ကောင်းကောင်းပါခင်ဗျာ့` // Initial greeting
=======
        // Add initial message from Kaung Kaung after role is set
        setChatHistory([{
          role: 'model',
          content: `ဟယ်လို! ကျွန်တော်က Kaung Kaung ပါ။ ဒီနေ့ ဘာကူညီရမလဲ။` // Initial greeting
>>>>>>> origin/main
        }]);
      } else {
        toast.error("Please enter a valid grade between 1 and 11.");
      }
<<<<<<< HEAD
=======
    } else if (role === 'teacher') {
      setUserRole('teacher');
      // Add initial message from Kaung Kaung after role is set
      setChatHistory([{
        role: 'model',
        content: `ဟယ်လို! ကျွန်တော်က Kaung Kaung ပါ။ ဒီနေ့ ဘာကူညီရမလဲ။` // Initial greeting
      }]);
>>>>>>> origin/main
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading || userRole === null) return; // Ensure role is set before submitting chat messages

    const currentQuestion = question;
    setQuestion('');
    setIsLoading(true);

    // Add user question immediately
    setChatHistory(prev => {
      const newUserMessage: { role: 'user' | 'model'; content: string; imageUrl?: string } = {
        role: 'user',
        content: currentQuestion,
      };
      if (selectedFile) {
        // Create a temporary URL for the selected file to display it immediately
        newUserMessage.imageUrl = URL.createObjectURL(selectedFile);
      }
      return [...prev, newUserMessage, {
        role: 'model',
        content: 'Thinking...' // Loading state
      }];
    });

    let accumulatedContent = ''; // Declare accumulatedContent here

    try {
      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
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

      // promptContent = `${userContext} ${promptContent}`; // Removed userContext from prompt

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
        try {
          const fileDataUrl = await readFileAsDataURL(selectedFile);
          const base64Data = fileDataUrl.split(',')[1]; // Extract base64 data

          // Add the image part to the last message (which is the current user message)
          currentUserMessage.parts.push({
            inlineData: {
              data: base64Data,
              mimeType: selectedFile.type,
            },
          });
        } catch (error) {
          console.error('File Reading Error:', error);
          // Handle file reading error, maybe show a toast to the user
          setIsLoading(false);
          setSelectedFile(null);
          toast.error("Failed to read the selected file.");
          return; // Stop processing if file reading fails
        }
      }

      // Now, make the API call with all messages (including potential image part)
      try {
        const streamingResult = await model.generateContentStream({ contents: allMessages });

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
            accumulatedContent += char;
            // Update state with each character for a typing effect
            setChatHistory(prev =>
              prev.map((item, index) =>
                index === prev.length - 1 && item.role === 'model'
                  ? { ...item, content: accumulatedContent }
                  : item
              )
            );
            // Add a small delay for the typing effect (adjust delay as needed)
            await new Promise(resolve => setTimeout(resolve, 15)); // 15ms delay per character
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
          } else if (error.message.includes('API key not valid')) {
             errorMessage = 'API key not valid. Please check your .env file.';
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
        setSelectedFile(null); // Clear selected file state
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear the file input element
        }
      }
    } catch (error) {
      console.error('Overall Error:', error);
      // This catch block will handle errors not caught by the inner try/catch,
      // such as issues with model initialization or initial message preparation.
      let errorMessage = 'An unexpected error occurred.';
       if (error instanceof Error && error.message.includes('API key not valid')) {
             errorMessage = 'API key not valid. Please check your .env file.';
          }
      setChatHistory(prev =>
        prev.map((item, index) =>
          index === prev.length - 1 && item.role === 'model'
            ? { ...item, content: errorMessage }
            : item
        )
      );
      setIsLoading(false);
      setSelectedFile(null); // Clear selected file state
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input element
      }
    }
<<<<<<< HEAD
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#E5DEFF] p-4 sm:p-6 md:p-8">
      <div className="flex flex-col max-w-3xl mx-auto w-full flex-grow">
        {/* Header */}
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-robotic font-bold text-center text-[#221F26] mb-4 md:mb-6 pt-4 md:pt-4 flex items-center justify-center gap-2 md:gap-3 animate-fade-in-from-top"> {/* Adjusted margin-bottom and padding-top */}
        <img src="/selfie bot.gif" alt="Kaung Kaung" className="w-[70px] h-[70px] md:w-[95px] md:h-[95px] mt-2 object-contain" />
          Better Change AI Tutor
        </h1>

        {/* Conditional rendering based on userRole */}
        {userRole === null && (
          /* Role Input Form */
          <form onSubmit={(e) => handleRoleSubmit('student', e)} className="bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col items-center justify-center flex-grow relative overflow-hidden">
            {/* Small GIF - always rendered within the form, classes change based on isAnimating */}


            {/* Other initial form elements - only rendered when not animating */}
                <img src="/original-2b1bda72996c25af018e9-unscreen.gif" alt="Kaung Kaung GIF" className="mb-4 w-[150px] h-[150px] md:w-[200px] md:h-[200px] object-contain" />
                <div className="flex items-center justify-center mb-4 text-center">
                  <AnimatedText text="Please enter your grade to start chatting with Kaung Kaung" className="text-base md:text-lg text-center font-doto font-bold mr-1" />

                </div>
                <Input
                  type="number"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="Enter your grade (1-11)"
                  className="w-full max-w-xs mb-4 text-center text-sm md:text-base"
                  min="1"
                  max="11"
                />
                <Button type="submit" className="px-4 md:px-6 rounded-full bg-[#8B5CF6] hover:bg-[#7E69AB] text-sm md:text-base">
                  I am a Student
                </Button>
                <Button
                  type="button" // Use type="button" to prevent form submission
                  onClick={() => handleRoleSubmit('teacher')} // Handle teacher role
                  className="px-4 md:px-6 rounded-full bg-gray-500 hover:bg-gray-600 mt-2 text-sm md:text-base"
                >
                  I am a Teacher
                </Button>
          </form>
        )}

        {userRole !== null && (
          /* Chat Interface */
          <>
            {/* Chat Container */}
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 flex-grow overflow-hidden">
              <ScrollArea className="h-full w-full pr-4">
                {chatHistory.map((message, index) => (
                  <div key={index} className="space-y-4 mb-6">
                    {message.role === 'user' ? (
                      /* User Message */
                      <div className="flex justify-end">
                        <div className="bg-[#8B5CF6] text-white rounded-2xl rounded-tr-none px-3 py-2 md:px-4 md:py-2 max-w-[80%] text-sm md:text-base">
                          {message.imageUrl && (
                            <img src={message.imageUrl} alt="Uploaded content" className="max-w-sm h-auto rounded-lg mb-2 p-1" />
                          )}
                          <p className="text-sm md:text-base">{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      /* AI Message */
                      <div className="flex items-start gap-2 md:gap-3">
                        <img src="/robotic.gif" alt="Kaung Kaung" className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] mt-2 object-contain" />
                        <div className="bg-gray-100 rounded-2xl rounded-tl-none px-3 py-2 md:px-4 md:py-2 max-w-[80%] text-sm md:text-base">
                          <div className="text-sm md:text-base whitespace-pre-wrap">
                            {message.content.startsWith('Thinking') ? (
                              `thinking${loadingDots}`
                            ) : (
                              // Use ReactMarkdown for the AI's response to render markdown
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={endOfMessagesRef} />
              </ScrollArea>
            </div>

            {/* Input Form */}
            {/* Input Form */}
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4 md:p-6 flex-shrink-0">
              <div className="flex gap-2 md:gap-3 items-center">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className={`flex items-center justify-center size-8 md:size-10 rounded-full ${selectedFile ? 'bg-blue-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                    <Paperclip className={`size-4 md:size-5 ${selectedFile ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden" // Hide the actual file input
                    disabled={isLoading}
                    ref={fileInputRef} // Attach the ref here
                  />
                </label>
                {selectedFile && (
                  <span className="text-xs md:text-sm text-gray-600 max-w-[100px] overflow-hidden text-ellipsis">{selectedFile.name}</span>
                )}
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask me anything 🌱"
                  className="flex-1 p-2 md:p-4 text-sm md:text-base rounded-full"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 md:px-6 rounded-full bg-[#8B5CF6] hover:bg-[#7E69AB] text-sm md:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      {/* Simple loading spinner - replace with a proper component if available */}
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    "Ask!"
                  )}
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
=======
 
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
>>>>>>> origin/main
