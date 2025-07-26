import { createElement } from "@minireact";
import type { Difficulty } from "@/types/games";

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const difficultyToValue = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case "Beginner":
      return 0;
    case "Easy":
      return 1;
    case "Medium":
      return 2;
    case "Hard":
      return 3;
    case "Expert":
      return 4;
    default:
      return 2;
  }
};

const valueToDifficulty = (value: number): Difficulty => {
  const difficulties: Difficulty[] = [
    "Beginner",
    "Easy",
    "Medium",
    "Hard",
    "Expert",
  ];
  return difficulties[value] || "Medium";
};

export default function DifficultySelector({
  difficulty,
  onDifficultyChange,
}: DifficultySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        Difficulty: <span className="font-bold">{difficulty}</span>
      </label>
      <div className="flex items-center space-x-4">
        <span className="text-xs themed-text-secondary">Beginner</span>
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={difficultyToValue(difficulty)}
          onInput={(e: Event) => {
            const target = e.target as HTMLInputElement;
            onDifficultyChange(valueToDifficulty(Number(target.value)));
          }}
          className="w-full h-2 themed-bg rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs themed-text-secondary">Expert</span>
      </div>
    </div>
  );
}
