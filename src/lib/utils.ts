import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatChatText(input: string): string {
  // Split input into lines
  const lines = input.split('\n');
  const formattedLines = lines
    // Filter out code-related lines: imports, exports, and code fences
    .filter(line => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith('import ') &&
        !trimmed.startsWith('export ') &&
        !trimmed.startsWith('```')
      );
    })
    // Remove markdown list markers
    .map(line => line.startsWith('* ') ? line.substring(2) : line);

  // Join lines back and strip bold markers
  let text = formattedLines.join('\n');
  text = text.replace(/\*\*/g, '');       // Remove bold markers

  // Note: Removed underscore replacement as its purpose was unclear and the pattern was too specific/risky.
  // If needed, please clarify the intended behavior for underscores.

  return text;
}
