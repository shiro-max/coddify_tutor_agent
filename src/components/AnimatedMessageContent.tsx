import React, { useState, useEffect, Fragment } from 'react';

interface AnimatedMessageContentProps {
  content: string; // Raw content string from the AI
  delay?: number; // Delay in milliseconds between characters
  className?: string; // Optional class name for styling
  renderContent: (content: string) => (string | JSX.Element)[]; // Function to process content
}

const AnimatedMessageContent: React.FC<AnimatedMessageContentProps> = ({
  content,
  delay = 20, // Faster default delay
  className,
  renderContent,
}) => {
  const [displayedParts, setDisplayedParts] = useState<(string | JSX.Element)[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  // Process the full content into parts once when content changes
  const fullParts = renderContent(content);

  useEffect(() => {
    if (currentPartIndex < fullParts.length) {
      const currentPart = fullParts[currentPartIndex];

      if (typeof currentPart === 'string') {
        // Animate string parts character by character
        if (currentCharIndex < currentPart.length) {
          const timeoutId = setTimeout(() => {
            setDisplayedParts(prevParts => {
              const newParts = [...prevParts];
              // Ensure the current part exists in displayedParts and is a string
              if (newParts.length <= currentPartIndex) {
                 // This case should ideally not happen if logic is correct, but as a safeguard:
                 console.error("AnimatedMessageContent: Mismatch in parts array length");
                 return prevParts;
              }
              if (typeof newParts[currentPartIndex] !== 'string') {
                 // This part was expected to be a string but isn't, likely a logic error
                 console.error("AnimatedMessageContent: Expected string part, but found JSX element");
                 return prevParts;
              }

              // Append the next character
              newParts[currentPartIndex] = (newParts[currentPartIndex] as string) + currentPart[currentCharIndex];
              return newParts;
            });
            setCurrentCharIndex(prevIndex => prevIndex + 1);
          }, delay);
          return () => clearTimeout(timeoutId);
        } else {
          // Move to the next part if the current string part is finished
          setCurrentPartIndex(prevIndex => prevIndex + 1);
          setCurrentCharIndex(0); // Reset character index for the next part
        }
      } else {
        // Add JSX elements immediately and move to the next part
        setDisplayedParts(prevParts => {
           const newParts = [...prevParts];
           // Ensure we don't add duplicates if effect runs multiple times before state updates
           if (newParts.length <= currentPartIndex) {
              newParts.push(currentPart);
           } else {
              // Replace placeholder or previous state for this index
              newParts[currentPartIndex] = currentPart;
           }
           return newParts;
        });
        setCurrentPartIndex(prevIndex => prevIndex + 1);
        setCurrentCharIndex(0); // Reset character index (though not used for JSX)
      }
    }
  }, [currentPartIndex, currentCharIndex, delay, fullParts, content]); // Added content to dependencies

  // Reset animation when content changes
  useEffect(() => {
    setDisplayedParts([]);
    setCurrentPartIndex(0);
    setCurrentCharIndex(0);
  }, [content]);


  return (
    <span className={className}>
      {displayedParts.map((part, index) => (
        // Use React.Fragment for string parts to avoid extra divs/spans
        <Fragment key={index}>
          {part}
        </Fragment>
      ))}
    </span>
  );
};

export default AnimatedMessageContent;