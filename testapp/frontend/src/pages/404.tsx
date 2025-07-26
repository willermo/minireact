import { createElement } from "@minireact";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-red-600">
      <h1>404</h1>
      <p>Page not found</p>
    </div>
  );
}
