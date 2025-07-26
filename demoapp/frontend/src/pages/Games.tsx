import { createElement, Link } from "@minireact";
import type { VNode } from "@minireact";
import { getCsrfToken } from "../lib/api";

interface GameCardProps {
  title: string;
  description: string;
  to: string;
  key?: string | number;
}

export function GameCard({
  title,
  description,
  to,
  key,
}: GameCardProps): VNode {
  return (
    <Link to={to} key={key} children="">
      <div className="border rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </Link>
  );
}

export default function Games() {
  const games: GameCardProps[] = [
    {
      title: "Classic Pong",
      description:
        "The original Pong experience. Play against the computer or a friend!",
      to: "/games/pong",
      key: "pong-classic",
    },
    {
      title: "Tic Tac Toe",
      description: "Play Tic Tac Toe against the computer or a friend!",
      to: "/games/tictactoe",
      key: "tictactoe-classic",
    },
    {
      title: "Connect Four",
      description: "Play Connect Four against the computer or a friend!",
      to: "/games/connectfour",
      key: "connectfour-classic",
    },
    {
      title: "Tournament",
      description: "Compete in a tournament with other players.",
      to: "/tournaments",
      key: "pong-tournament",
    },
  ];

  return (
    <div className="flex flex-col space-y-4">
      {games.map(game => {
        if (game.title === "Tournament" && !getCsrfToken()) {
          return null;
        }
        return <GameCard key={game.key} {...game} />;
      })}
    </div>
  );
}
