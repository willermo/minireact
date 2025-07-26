import { createElement } from "@minireact";

interface ConnectFourPlayerCountProps {
  numPlayers: number;
  onPlayerCountChange: (count: number) => void;
}

export default function ConnectFourPlayerCount({
  numPlayers,
  onPlayerCountChange,
}: ConnectFourPlayerCountProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2 text-center">
        Number of Players: <span className="font-bold">{numPlayers}</span>
      </label>
      <div className="flex items-center space-x-4">
        <span className="text-xs themed-text-secondary">2</span>
        <div className="relative w-full h-2">
          <div className="absolute inset-0 themed-bg rounded-lg"></div>
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-lg"
            style={`width: ${((numPlayers - 2) / 4) * 100}%;`}
          ></div>
          <input
            type="range"
            min="2"
            max="6"
            step="1"
            value={numPlayers}
            onInput={(e: Event) => {
              const target = e.target as HTMLInputElement;
              onPlayerCountChange(Number(target.value));
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <span className="text-xs themed-text-secondary">6</span>
      </div>
    </div>
  );
}
