import { createElement, Link } from "@minireact";
import type { VNode } from "@minireact";
import { getCsrfToken } from "../lib/api";

interface CardProps {
  title: string;
  description: string;
  to: string;
  key?: string | number;
}

export function Card({ title, description, to, key }: CardProps): VNode {
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
      title: "Test section 1",
      description:
        "Test section 1 description. This should describe the kind of tests that this card link brings the user to",
      to: "/tests/1",
      key: "test-1",
    },
    {
      title: "Test section 2",
      description:
        "Test section 2 description. This should describe the kind of tests that this card link brings the user to",
      to: "/tests/2",
      key: "test-2",
    },
    {
      title: "Test section 3",
      description:
        "Test section 3 description. This should describe the kind of tests that this card link brings the user to",
      to: "/tests/3",
      key: "test-3",
    },
    {
      title: "Protected Tests",
      description:
        "Protected Tests description. This should describe the kind of tests that this card link brings the user to. The Protected test section is intended to test protected content components behavior. It requires authentication.",
      to: "/protected-tests",
      key: "protected-tests",
    },
  ];

  return (
    <div className="flex flex-col space-y-4">
      {tests.map(test => {
        if (test.title === "Protected Tests" && !getCsrfToken()) {
          return null;
        }
        return <Card key={test.key} {...test} />;
      })}
    </div>
  );
}
