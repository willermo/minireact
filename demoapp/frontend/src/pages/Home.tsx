// src/pages/Home.tsx
import { createElement, useState, useEffect, useRef, Link } from "@minireact";
import PongCanvas from "@components/PongCanvas";
import ConnectFourCanvas from "../components/ConnectFourCanvas";
import TicTacToeCanvas from "../components/TicTacToeCanvas";
import type { PlayerConfig } from "@/types/games";
import type { EnrichedMatch } from "@/types/matches";
import HeroImage from "/images/retro-arcade.jpg";
import MatchSummary from "@components/games/MatchesTable";

export default function Home() {
  const pongDemoPlayers: PlayerConfig[] = [
    {
      id: 0,
      type: "ai",
      color: "#FF0000",
      difficulty: "Expert",
      avatar: "default-avatar.png",
    },
    {
      id: 1,
      type: "ai",
      color: "#00FF00",
      difficulty: "Expert",
      avatar: "default-avatar.png",
    },
  ];

  const connectFourDemoPlayers: PlayerConfig[] = [
    {
      id: 0,
      type: "ai",
      color: "#e53e3e", // Red
      difficulty: "Expert",
      avatar: "default-avatar.png",
      name: "Red AI",
    },
    {
      id: 1,
      type: "ai",
      color: "#d69e2e", // Yellow
      difficulty: "Expert",
      avatar: "default-avatar.png",
      name: "Yellow AI",
    },
    {
      id: 2,
      type: "ai",
      color: "#38a169", // Green
      difficulty: "Expert",
      avatar: "default-avatar.png",
      name: "Green AI",
    },
    {
      id: 3,
      type: "ai",
      color: "#3182ce", // Blue
      difficulty: "Expert",
      avatar: "default-avatar.png",
      name: "Blue AI",
    },
  ];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(240);

  const [matchHistory, setMatchHistory] = useState<EnrichedMatch[]>([]);

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

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch("/api/games/matches");
        if (!response.ok) {
          throw new Error("Failed to fetch matches");
        }
        const { data } = await response.json();
        setMatchHistory(data);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchMatches();
  }, []);

  return (
    <div className="home-page">
      <section id="hero" className="relative">
        <img
          src={HeroImage}
          alt="Five players playing games around a holographic table"
          className="w-full h-auto object-cover"
        />

        <h1 className="text-2xl md:text-4xl text-center font-bold text-white absolute top-0 w-full left-1/2 transform -translate-x-1/2 bg-black/50 p-2 md:p-6 ">
          Welcome to Transcendence
        </h1>
      </section>
      <section
        id="description"
        className={`${descriptionCard} my-6 md:my-12 mx-auto w-full md:w-3/4 text-justify rounded-lg p-2 md:p-4`}
      >
        <p className="text-xl my-1 text-justify">
          Welcome to the ultimate retro gaming experience! Transcendence brings
          classic games like Pong to your browser with next-level vibes. <br />{" "}
          Play solo to level up your skills or{" "}
          <strong>join our hype community to flex on real players</strong> in
          ranked matches and tournaments.
        </p>
        <p className="text-xl my-1 text-justify">
          It's time to <strong>level up</strong> — let's go!
        </p>
      </section>

      <section
        id="gameCards"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 max-w-7xl mx-auto"
      >
        <div
          className={`${blueGlowCard} w-full max-w-md mx-auto`}
          ref={containerRef}
        >
          <p className="game-description-card h-[350px] overflow-y-auto px-4 py-4 text-lg font-medium rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/40 border border-blue-200 dark:border-blue-700 shadow-inner hover:shadow-blue-200 dark:hover:shadow-blue-700/30 transition duration-300">
            <span className="block mb-2 text-center">
              <span className="font-black text-blue-600 text-xl tracking-wide">
                THE OG CLASSIC
              </span>{" "}
              🏓
            </span>
            Slide into intense 1v1 matches with{" "}
            <span className="font-bold">lightning-fast reflexes</span>.
            <span className="block mt-2">
              No cap, this game{" "}
              <span className="italic font-semibold">hits different</span> when
              you're battling friends for the top spot on our leaderboards.
            </span>
            <span className="block mt-2 text-center">
              Ready to{" "}
              <span className="font-extrabold text-blue-600 animate-pulse">
                flex those gaming muscles
              </span>{" "}
              and show everyone who's the real Pong champ? 🏆
            </span>
          </p>
          <PongCanvas
            demoMode={true}
            canvasId="pong-canvas-home"
            canvasWidth={containerWidth}
            targetScore={3}
            onWinner={() => {}}
            aiLevel={3}
            playerColors={["#3182ce", "#e53e3e"]}
            players={pongDemoPlayers}
            gameMode="1v1"
            gameActive={true}
          />
          <Link
            to="/games/pong"
            children="Play Pong!"
            className="block w-full mt-4 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Play Pong!
          </Link>
        </div>
        <div className={`${purpleGlowCard} w-full max-w-md mx-auto`}>
          <p className="game-description-card h-[350px] overflow-y-auto px-4 py-4 text-lg font-medium rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/40 border border-purple-200 dark:border-purple-700 shadow-inner hover:shadow-purple-200 dark:hover:shadow-purple-700/30 transition duration-300">
            <span className="block mb-2 text-center">
              <span className="font-black text-purple-600 text-xl tracking-wide">
                BRAIN BATTLES
              </span>{" "}
              🎮
            </span>
            Think you can <span className="font-bold">outsmart</span> your
            friends? This isn't your grandma's Tic Tac Toe!
            <span className="block mt-2">
              Our version comes with{" "}
              <span className="font-bold">epic animations</span> and strategic
              gameplay that'll have you{" "}
              <span className="italic font-semibold">shook</span>.
            </span>
            <span className="block mt-2 text-center">
              Challenge the squad, climb the ranks, and become the{" "}
              <span className="font-extrabold text-purple-600 animate-pulse">
                ultimate big brain
              </span>{" "}
              of the Tic Tac Toe universe! 🧠
            </span>
          </p>
          <TicTacToeCanvas
            mode="ai"
            aiLevel={3}
            resetKey={0}
            demoMode={true}
            canvasWidth={Math.min(containerWidth, 240)}
            canvasHeight={180}
            onGameEnd={() => {}}
            playerColors={["#7c3aed", "#55f75aff"]}
          />
          <Link
            to="/games/tictactoe"
            children="Play Tic Tac Toe!"
            className="block w-full mt-4 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Play Tic Tac Toe!
          </Link>
        </div>
        <div className={`${greenGlowCard} w-full max-w-md mx-auto`}>
          <p className="game-description-card h-[350px] overflow-y-auto px-4 py-4 text-lg font-medium rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/40 border border-green-200 dark:border-green-700 shadow-inner hover:shadow-green-200 dark:hover:shadow-green-700/30 transition duration-300">
            <span className="block mb-2 text-center">
              <span className="font-black text-green-600 text-xl tracking-wide">
                DROP IT LIKE IT'S HOT
              </span>{" "}
              🔥
            </span>
            This strategy game is{" "}
            <span className="font-bold">lowkey addictive</span> and{" "}
            <span className="italic font-semibold">highkey competitive</span>.
            <span className="block mt-2">
              One wrong move and it's game over! Build your streaks, outsmart
              your opponents, and watch them rage quit when you drop that
              winning piece.
            </span>
            <span className="block mt-2 text-center">
              This ain't your average Connect 4 — it's{" "}
              <span className="font-extrabold text-green-600 animate-pulse">
                elite
              </span>
              ! 💯
            </span>
          </p>
          <ConnectFourCanvas
            demoMode={true}
            canvasId="connect-four-home"
            canvasWidth={Math.min(containerWidth, 300)}
            canvasHeight={180}
            players={connectFourDemoPlayers}
          />
          <Link
            to="/games/connectfour"
            children="Play Connect 4!"
            className="block w-full mt-4 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            Play Connect 4!
          </Link>
        </div>
      </section>
      <section
        id="matchHistory"
        className="w-full max-w-7xl mx-auto px-4 mt-12"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
          Last matches
        </h2>
        <div className="flex flex-col gap-4">
          <MatchSummary matchHistory={matchHistory} />
        </div>
      </section>
    </div>
  );
}
