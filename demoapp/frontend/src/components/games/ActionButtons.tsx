import { createElement } from "@minireact";
import type { MatchType } from "@/types/games";

interface ActionButtonsProps {
  onReset: () => void;
  onStart: () => void;
  matchType: MatchType;
  rosterComplete: boolean;
  startButtonText?: string;
  resetButtonText?: string;
}

export default function ActionButtons({
  onReset,
  onStart,
  matchType,
  rosterComplete,
  startButtonText = "Start Game",
  resetButtonText = "Reset to default values",
}: ActionButtonsProps) {
  if (matchType === "ranked" && !rosterComplete) {
    startButtonText = "Complete Roster to Start";
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onReset}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white themed-bg hover:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {resetButtonText}
      </button>
      <button
        onClick={onStart}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={matchType === "ranked" && !rosterComplete}
      >
        {startButtonText}
      </button>
    </div>
  );
}
