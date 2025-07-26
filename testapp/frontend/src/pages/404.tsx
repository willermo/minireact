import { createElement } from "@minireact";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-red-600">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page not found</p>
    </div>
  );
}
