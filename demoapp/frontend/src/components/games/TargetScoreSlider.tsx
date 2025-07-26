import { createElement } from "@minireact";
import type { GameSettings } from "@/types/games";

interface TargetScoreSliderProps {
  gameSettings: GameSettings;
  onTargetScoreChange: (value: number) => void;
}

export default function TargetScoreSlider({
  gameSettings,
  onTargetScoreChange,
}: TargetScoreSliderProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Target Score:{" "}
        <span className="font-bold">{gameSettings.targetScore}</span>
      </label>
      <div className="flex items-center space-x-4">
        <span className="text-xs themed-text-secondary">3</span>
        <div className="relative w-full h-2">
          <div className="absolute inset-0 themed-bg rounded-lg"></div>
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-lg"
            style={`width: ${((gameSettings.targetScore - 3) / 7) * 100}%;`}
          ></div>
          <input
            type="range"
            min="3"
            max="10"
            step="1"
            value={gameSettings.targetScore}
            onInput={(e: Event) => {
              const target = e.target as HTMLInputElement;
              onTargetScoreChange(Number(target.value));
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <span className="text-xs themed-text-secondary">10</span>
      </div>
    </div>
  );
}
