import { createElement, useContext } from "@minireact";
import type { VNode } from "@minireact";
import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";
import CookieConsent from "@/components/CookieConsent.tsx";
import { ThemeContext } from "./contexts/ThemeContext";

interface LayoutProps {
  children?: VNode | VNode[];
  [key: string]: any;
}

export default function Layout({ children }: LayoutProps) {
  const { isDark } = useContext(ThemeContext);

  return (
    <div className="min-h-screen flex flex-col themed-bg transition-colors duration-200">
      <Header />
      <div
        className="min-h-screen py-8 px-4 h-full bg-cover bg-center bg-no-repeat"
        style={
          isDark
            ? "background-image: linear-gradient(rgba(17, 24, 39, 0.9), rgba(17, 24, 39, 0.9)), url('/images/home-bg.jpg');"
            : "background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/images/home-bg.jpg');"
        }
      >
        <main className="flex-1 container mx-auto themed-card rounded-lg">
          {children}
        </main>
      </div>
      <Footer />
      <CookieConsent />
    </div>
  );
}
