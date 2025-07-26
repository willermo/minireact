import { createElement } from "@minireact";
import type { GameSettings } from "@/types/games";

interface MatchTypeSelectorProps {
  gameSettings: GameSettings;
  onMatchTypeChange: (matchType: "skirmish" | "ranked") => void;
}

export default function MatchTypeSelector({
  gameSettings,
  onMatchTypeChange,
}: MatchTypeSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-center font-medium mb-2">
        Match Type
      </label>
      <div className="flex space-x-4">
        <label
          className={`inline-flex items-center px-3 py-1.5 rounded cursor-pointer ${
            gameSettings.matchType === "skirmish"
              ? "bg-blue-600 text-white"
              : "themed-bg"
          }`}
        >
          <input
            type="radio"
            name="match-type"
            value="skirmish"
            checked={gameSettings.matchType === "skirmish"}
            onInput={() => onMatchTypeChange("skirmish")}
            className="hidden"
          />
          Skirmish
        </label>
        <label
          className={`inline-flex items-center px-3 py-1.5 rounded cursor-pointer ${
            gameSettings.matchType === "ranked"
              ? "bg-blue-600 text-white"
              : "themed-bg"
          }`}
        >
          <input
            type="radio"
            name="match-type"
            value="ranked"
            checked={gameSettings.matchType === "ranked"}
            onInput={() => onMatchTypeChange("ranked")}
            className="hidden"
          />
          Ranked
        </label>
      </div>
    </div>
  );
}
