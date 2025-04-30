import React, { useState, useEffect } from 'react';

interface AnimatedTextProps {
  text: string;
  delay?: number; // Delay in milliseconds between characters
  className?: string; // Optional class name for styling
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ text, delay = 30, className }) => { // Reduced delay for faster animation
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [currentIndex, delay, text]);

  return (
    <span className={className}>{displayedText}</span>
  );
};

export default AnimatedText;