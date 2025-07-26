// src/pages/Home.tsx
import { createElement, useState, useEffect, useRef, Link } from "@minireact";
import HeroImage from "/images/retro-arcade.jpg";

export default function Home() {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(240);
  const descriptionCard =
    "p-2 md:p-4 md:rounded-lg md:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] md:hover:shadow-[0_20px_30px_rgba(8,112,184,0.3)] transition-all duration-300";
  const blueGlowCard =
    "flex flex-col justify-center gap-4 p-4 rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_30px_rgba(8,112,184,0.3)] transition-all duration-300";
  const purpleGlowCard =
    "flex flex-col justify-center gap-4 p-4 rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_30px_rgba(124,58,237,0.3)] transition-all duration-300";
  const greenGlowCard =
    "flex flex-col justify-center gap-4 p-4 rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_30px_rgba(22,163,74,0.3)] transition-all duration-300";

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        setContainerWidth(width * 0.9);
      }
    };

    updateWidth();

    window.addEventListener("resize", updateWidth);

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className="home-page">
      <section id="hero" className="relative">
        <img
          src={HeroImage}
          alt="Alt description of hero image"
          className="w-full h-auto object-cover"
        />

        <h1 className="text-2xl md:text-4xl text-center font-bold text-white absolute top-0 w-full left-1/2 transform -translate-x-1/2 bg-black/50 p-2 md:p-6 ">
          Welcome to testapp
        </h1>
      </section>
      
      <section
        id="description"
        className={`${descriptionCard} my-6 md:my-12 mx-auto w-full md:w-3/4 text-justify rounded-lg p-2 md:p-4`}
      >
        <p className="text-xl my-1 text-justify">
          Welcome to the editing of this astonishing paragraph. Help yourself writing two lines of text instead than a loremipsum or an ai generated text, relax your fingers and I think that, yes, you should have written enough
        </p>
        <p className="text-xl my-1 text-justify">
          It's time to <strong>make something useful out of this</strong> — let's go!
        </p>
      </section>

      <section
        id="testCards"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 max-w-7xl mx-auto"
      >
        <div
          className={`${blueGlowCard} w-full max-w-md mx-auto`}
          ref={containerRef}
        >
          <p className="game-description-card h-[350px] overflow-y-auto px-4 py-4 text-lg font-medium rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/40 border border-blue-200 dark:border-blue-700 shadow-inner hover:shadow-blue-200 dark:hover:shadow-blue-700/30 transition duration-300">
            <span className="block mb-2 text-center">
              <span className="font-black text-blue-600 text-xl tracking-wide">
                CARD 1 TITLE
              </span>{" "}
              🏓
            </span>
            Write your soul with{" "}
            <span className="font-bold">lightning-fast reflexes</span>.
            <span className="block mt-2">
              No cap, this exercise{" "}
              <span className="italic font-semibold">hits different</span> when
              you look at the screen and the screen looks at you.
            </span>
            <span className="block mt-2 text-center">
              Ready to{" "}
              <span className="font-extrabold text-blue-600 animate-pulse">
                flex those lazy neurons
              </span>{" "}
              and show everyone who's the real content editor? 🏆
            </span>
          </p>
          <Link
            to="/destinations/card-1"
            children="Card 1!"
            className="block w-full mt-4 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Follow Card 1!
          </Link>
        </div>
        <div className={`${purpleGlowCard} w-full max-w-md mx-auto`}>
          <p className="game-description-card h-[350px] overflow-y-auto px-4 py-4 text-lg font-medium rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/40 border border-purple-200 dark:border-purple-700 shadow-inner hover:shadow-purple-200 dark:hover:shadow-purple-700/30 transition duration-300">
            <span className="block mb-2 text-center">
              <span className="font-black text-purple-600 text-xl tracking-wide">
                CARD 2 TITLE
              </span>{" "}
              🎮
            </span>
            Write your soul with{" "}
            <span className="font-bold">lightning-fast reflexes</span>.
            <span className="block mt-2">
              No cap, this exercise{" "}
              <span className="italic font-semibold">hits different</span> when
              you look at the screen and the screen looks at you.
            </span>
            <span className="block mt-2 text-center">
              Ready to{" "}
              <span className="font-extrabold text-blue-600 animate-pulse">
                flex those lazy neurons
              </span>{" "}
              and show everyone who's the real content editor? 🏆
            </span>
          </p>
          <Link
            to="/destinations/card-2"
            children="Card 2!"
            className="block w-full mt-4 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Follow Card 2!
          </Link>
        </div>
        <div className={`${greenGlowCard} w-full max-w-md mx-auto`}>
          <p className="game-description-card h-[350px] overflow-y-auto px-4 py-4 text-lg font-medium rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/40 border border-green-200 dark:border-green-700 shadow-inner hover:shadow-green-200 dark:hover:shadow-green-700/30 transition duration-300">
            <span className="block mb-2 text-center">
              <span className="font-black text-green-600 text-xl tracking-wide">
                CARD 3 TITLE
              </span>{" "}
              🔥
            </span>
            Write your soul with{" "}
            <span className="font-bold">lightning-fast reflexes</span>.
            <span className="block mt-2">
              No cap, this exercise{" "}
              <span className="italic font-semibold">hits different</span> when
              you look at the screen and the screen looks at you.
            </span>
            <span className="block mt-2 text-center">
              Ready to{" "}
              <span className="font-extrabold text-blue-600 animate-pulse">
                flex those lazy neurons
              </span>{" "}
              and show everyone who's the real content editor? 🏆
            </span>
          </p>
          <Link
            to="/destinations/card-3"
            children="Card 3!"
            className="block w-full mt-4 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Follow Card!
          </Link>
        </div>
      </section>
    </div>
  );
}
