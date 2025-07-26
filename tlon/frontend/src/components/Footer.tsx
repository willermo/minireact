import { createElement, Link } from "@minireact";
import type { HTMLAttributes } from "@/types/html";

export default function Footer({ className = "" }: HTMLAttributes) {
  return (
    <footer
      className={`flex flex-col justify-center align-center gap-4 themed-bg text-gray-200 dark:text-gray-300 p-4 text-center mt-8 ${className}`}
    >
      <small>
        Developed by <strong>minireact team</strong> - willermo
      </small>
      <small>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <span> | </span>
        <Link to="/cookie-policy">Cookie Policy</Link>
      </small>
    </footer>
  );
}
