import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import AnimatedText from './AnimatedText';
import { Input } from "@/components/ui/input";
import { Bot, Paperclip } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm for GitHub Flavored Markdown

const SYSTEM_INSTRUCTION =`
You are Kaung Kaung, a friendly, emotionally intelligent AI tutor at Better Change School. Always detect the user’s language: respond in English if their input is in English; respond in Burmese (using “ကျွန်တော်”) if their input is in Burmese. Never ask to translate Burmese into English.

Core behavior:
- Warm, human tone; age-appropriate: playful + emojis (Grades 1–4), interactive placeholders (5–7), resource links (8–11), pedagogy tips (teachers).
- Embed brief encouragement or humor. If a student shows frustration or sadness, respond with sincere, age-appropriate support.
- If you’re ever uncertain, say “I’m not sure, but here’s how we can find out.”

Academic scope:
- Expert in Cambridge/Oxford/IGCSE/O-Level Math & Science, Singapore Maths, Oxford ICT.
- Cite syllabus points, use simple analogies, few-shot examples for style.

Formatting & safety:
- Use bullet lists for steps; wrap emojis or hints in <span>; render markdown for links/images.
- Avoid adult themes or violence.

Multimodal handling:
- If given an image with a question, analyze and answer; if without a question, describe and ask if they’d like details.

Session memory:
- Refer only to the last two user messages for follow-ups.

Special case: whenever the user asks about “Better Change,” respond in both languages:
- Burmese: “Better Change …09-785280686”
- English: “Better Change …Phone number: 09-785280686”
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
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null); // Reverted to initial state
  const [gradeInput, setGradeInput] = useState(''); // Reverted to initial state
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string; imageUrl?: string }[]>([]); // Added imageUrl
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingDots, setLoadingDots] = useState(''); // New state for loading dots
  // State for pre-fetched greeting
  const [fetchedGreeting, setFetchedGreeting] = useState<string | null>(null);
  const [isFetchingInitialGreeting, setIsFetchingInitialGreeting] = useState(true); // Track initial fetch status
  const [animateGreeting, setAnimateGreeting] = useState(false); // Flag to trigger greeting animation
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input
// Function to fetch a tailored greeting based on role and grade
  const fetchTailoredGreeting = async (role: 'student' | 'teacher', grade?: string) => {
    setIsFetchingInitialGreeting(true);
    setFetchedGreeting(null); // Reset in case of re-renders before fetch completes
    setChatHistory([{ role: 'model', content: 'Thinking...' }]); // Add initial thinking message

    try {
      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      let prompt = "Generate a short friendly welcome message.";
      if (role === 'student' && grade) {
        prompt = `Generate a short friendly welcome message for a student in grade ${grade}. Respond entirely in the language of the input. If the response is in English, start with "I am Kaung Kaung.". If the response is in Burmese, start with "ကျွန်တော် ကောင်ကောင်ပါ!".`;
      } else if (role === 'teacher') {
        prompt = "Generate a short friendly welcome message for a teacher. Respond entirely in the language of the input. If the response is in English, start with \"I am Kaung Kaung.\". If the response is in Burmese, start with \"ကျွန်တော် ကောင်ကောင်ပါ!\".";
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setFetchedGreeting(text || "Hello! I'm ready to help."); // Set fetched greeting or fallback
      // Update the thinking message with the fetched greeting
      setChatHistory(prev => {
        const updatedHistory = [...prev];
        if (updatedHistory.length > 0 && updatedHistory[0].role === 'model') {
          updatedHistory[0] = { ...updatedHistory[0], content: text || "Hello! I'm ready to help." };
        }
        return updatedHistory;
      });

    } catch (error) {
      console.error('Error fetching tailored greeting:', error);
      let errorMessage = "Sorry, I couldn't prepare my greeting. Please try refreshing.";
      if (error instanceof Error && error.message.includes('User location is not supported')) {
        errorMessage = getRandomVpnMessage(); // Use existing VPN message logic
      } else if (error instanceof Error && error.message.includes('API key not valid')) {
        errorMessage = 'API key not valid. Please check your .env file.';
      }
      setFetchedGreeting(errorMessage); // Set error message as greeting
       // Update the thinking message with the error
       setChatHistory(prev => {
        const updatedHistory = [...prev];
        if (updatedHistory.length > 0 && updatedHistory[0].role === 'model') {
          updatedHistory[0] = { ...updatedHistory[0], content: errorMessage };
        }
        return updatedHistory;
      });
    } finally {
      setIsFetchingInitialGreeting(false);
      setAnimateGreeting(true); // Trigger animation after fetching
    }
  };

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



  // Effect to animate the initial greeting
  useEffect(() => {
    if (animateGreeting && fetchedGreeting && chatHistory.length > 0 && chatHistory[0].role === 'model') {
      let charIndex = 0;
      const greetingText = fetchedGreeting || "Hello! How can I help you today?"; // Use fallback just in case

      const intervalId = setInterval(() => {
        if (charIndex < greetingText.length) {
          setChatHistory(prev => {
            // Ensure the first message exists and is a model message
            if (prev.length > 0 && prev[0].role === 'model') {
              const updatedHistory = [...prev];
              updatedHistory[0] = { ...updatedHistory[0], content: greetingText.substring(0, charIndex + 1) };
              return updatedHistory;
            }
            return prev; // Return previous state if conditions aren't met
          });
          charIndex++;
        } else {
          clearInterval(intervalId);
          setAnimateGreeting(false); // Animation complete
        }
      }, 20); // Adjust interval for typing speed (e.g., 20ms for faster animation)

      // Cleanup function to clear interval if component unmounts or dependencies change
      return () => clearInterval(intervalId);
    }
    // Reset flag if conditions aren't met (e.g., no fetchedGreeting)
    else if (animateGreeting) {
      setAnimateGreeting(false);
    }
  }, [animateGreeting, fetchedGreeting, chatHistory.length]); // Rerun if animation is triggered or greeting/history changes unexpectedly
  const handleRoleSubmit = (role: 'student' | 'teacher', e?: React.FormEvent) => {
    e?.preventDefault();


    // Clear chat history before setting the initial greeting
    setChatHistory([]);

    // Function to proceed after validation
    const proceedWithRole = () => {
      setUserRole(role);
      // Fetch tailored greeting after setting the role
      fetchTailoredGreeting(role, gradeInput);
    };

    if (role === 'teacher') {
      proceedWithRole();
    } else if (role === 'student') {
      const parsedGrade = parseInt(gradeInput, 10);
      if (!isNaN(parsedGrade) && parsedGrade >= 1 && parsedGrade <= 11) {
        proceedWithRole();
      } else {
        toast.error("Please enter a valid grade between 1 and 11.");
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => { // Removed internalPrompt parameter
    e?.preventDefault();
    // Only submit if there's a question, not loading, and role is set
    if (!question.trim() || isLoading || userRole === null) return;

    const currentQuestion = question;
    let promptContent = currentQuestion; // Use the user's question directly

    // Removed greeting generation logic (isGreetingCall, greetingMatch, if/else block)

    // Always add user message and thinking state for regular submissions
    setChatHistory(prev => {
      const newUserMessage: { role: 'user' | 'model'; content: string; imageUrl?: string } = {
        role: 'user',
        content: currentQuestion,
      };
      if (selectedFile) {
        // Create a temporary URL for the selected file to display it immediately
        newUserMessage.imageUrl = URL.createObjectURL(selectedFile);
      }
      // Add user message AND the 'Thinking...' state for the upcoming model response
      return [...prev, newUserMessage, {
        role: 'model',
        content: 'Thinking...' // Loading state for regular messages
      }];
    });

    setQuestion('');
    setIsLoading(true);

    let accumulatedContent = ''; // Declare accumulatedContent here

    try {
      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      // If a file is selected, prepend instruction to analyze the image
      if (selectedFile) {
        promptContent = `Analyze this image and respond in the language of the text provided: ${promptContent}`;
      }

      // Explicit Burmese-check and prompt modification if image is present
      if (selectedFile) {
        const isBurmese = /[\u1000-\u109F]/.test(currentQuestion);
        if (isBurmese) {
          // force the model to use Burmese
          promptContent = `မြန်မာလိုဖြေပါ။ ${promptContent}`;
        }
      }

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
        parts: [
          { text: `(User Role: ${userRole}, Grade: ${gradeInput})` }, // Add user context here
          { text: promptContent }
        ]
      };

      // Combine system instruction, history, and current message

      // 2) now include it at the front of your payload
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

        // Update the *last* message (which is the 'Thinking...' state) to empty to start streaming
        setChatHistory(prev => {
          const targetIndex = prev.length - 1; // Always target the last message
          // Ensure targetIndex is valid
          if (targetIndex < 0) return prev;
          return prev.map((item, index) =>
            index === targetIndex && item.role === 'model'
              ? { ...item, content: '' } // Clear the 'Thinking...' message
              : item
          );
        });

        for await (const chunk of streamingResult.stream) {
          const chunkText = chunk.text();
          for (const char of chunkText) {
            accumulatedContent += char;
            // Update state with each character for a typing effect
            // Update the *last* message with streamed content
            setChatHistory(prev => {
              const targetIndex = prev.length - 1; // Always target the last message
              // Ensure targetIndex is valid before mapping
              if (targetIndex < 0 || targetIndex >= prev.length) return prev;
              return prev.map((item, index) =>
                index === targetIndex && item.role === 'model'
                  ? { ...item, content: accumulatedContent }
                  : item
              );
            });
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
        // Update the *last* message with error
        setChatHistory(prev => {
          const targetIndexOnError = prev.length - 1; // Always target the last message
          // Ensure targetIndex is valid before mapping
          if (targetIndexOnError < 0 || targetIndexOnError >= prev.length) return prev;
          return prev.map((item, index) =>
            index === targetIndexOnError && item.role === 'model'
              ? { ...item, content: errorMessage }
              : item
          );
        });
      } finally {
        setIsLoading(false);
        // Removed setIsGeneratingGreeting(false);
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
      // Update the *last* message with error
      setChatHistory(prev => {
        const targetIndexOnOverallError = prev.length - 1; // Always target the last message
        // Ensure targetIndex is valid before mapping
        if (targetIndexOnOverallError < 0 || targetIndexOnOverallError >= prev.length) return prev;
        return prev.map((item, index) =>
          index === targetIndexOnOverallError && item.role === 'model'
            ? { ...item, content: errorMessage }
            : item
        );
      });
      setIsLoading(false);
      // Removed setIsGeneratingGreeting(false);
      setSelectedFile(null); // Clear selected file state
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input element
      }
    }
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
        {/* Conditional rendering based on userRole */}
        {userRole === null ? (
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
        ) : (
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
                            {index === 0 && isFetchingInitialGreeting ? (
                              `Thinking${loadingDots}` // Display thinking for the first message while fetching initial greeting with animation
                            ) : message.content.startsWith('Thinking') ? (
                              `Thinking${loadingDots}` // Existing logic for regular thinking messages
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
