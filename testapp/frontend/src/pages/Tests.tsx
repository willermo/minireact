import { createElement, Link } from "@minireact";
import type { VNode } from "@minireact";
import { getCsrfToken } from "../lib/api";

interface CardProps {
  title: string;
  description: string;
  to: string;
  key?: string | number;
}

export function Card({
  title,
  description,
  to,
  key,
}: CardProps): VNode {
  return (
    <Link to={to} key={key} children="">
      <div className="border rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </Link>
  );
}

export default function Tests() {
  const tests: CardProps[] = [
    {
      title: "Card 1",
      description:
        "Text of card one",
      to: "/destinations/card-1",
      key: "card-1",
    },
    {
      title: "Card 2",
      description: "Text of card two",
      to: "/destinations/card-2",
      key: "card-2",
    },
    {
      title: "Card 3",
      description: "Text of card three",
      to: "/destinations/card-3",
      key: "card-3",
    },
    {
      title: "Conditional Card",
      descr/destinations/conditional-card",
      key: "conditional-card",
    },
  ];

  return (
    <div className="flex flex-col space-y-4">
      {tests.map(test => {
        if (test.title === "Conditional Card" && !getCsrfToken()) {
          return null;
        }
        return <GameCard key={game.key} {...game} />;
      })}
    </div>
  );
}
