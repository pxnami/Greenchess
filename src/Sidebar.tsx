import {
  ChartNoAxesCombined,
  Upload,
  Puzzle,
  GraduationCap,
  ChevronDown,
  ExternalLink,
  BookOpen,
  Search,
} from "lucide-react";
import type { Lang } from "./chess";
import { pieceImage } from "./theme";

type Props = {
  lang: Lang;
  tab: string;
  setLang: (lang: Lang) => void;
  onImport: () => void;
  onMoves: () => void;
  onOverview: () => void;
  onProfile: () => void;
};

export function Sidebar({
  lang,
  tab,
  setLang,
  onImport,
  onMoves,
  onOverview,
  onProfile,
}: Props) {
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  return (
    <header className="sidebar">
      <a
        className="brand"
        href={import.meta.env.BASE_URL}
        onClick={(event) => {
          event.preventDefault();
          onMoves();
        }}
      >
        <img src={pieceImage("w", "p")} alt="" />
        <span>GreenChess</span>
      </a>
      <nav aria-label={t("Hauptmenü", "Main menu")}>
        <button
          className={tab === "moves" ? "nav-item active" : "nav-item"}
          onClick={onMoves}
          aria-label={t("Analysieren", "Analyze")}
        >
          <ChartNoAxesCombined />
          <span>{t("Analysieren", "Analyze")}</span>
        </button>
        <button
          className={tab === "profile" ? "nav-item active" : "nav-item"}
          onClick={onProfile}
          aria-label={t("Spielersuche", "Player search")}
        >
          <Search />
          <span>{t("Spielersuche", "Player search")}</span>
        </button>
        <button
          className="nav-item"
          onClick={onImport}
          aria-label={t("Partie laden", "Load game")}
        >
          <Upload />
          <span>{t("Partie laden", "Load game")}</span>
        </button>
        <button
          className={tab === "overview" ? "nav-item active" : "nav-item"}
          onClick={onOverview}
          aria-label={t("Übersicht", "Overview")}
        >
          <BookOpen />
          <span>{t("Übersicht", "Overview")}</span>
        </button>
        <a
          className="nav-item"
          href="https://www.chess.com/puzzles"
          target="_blank"
          rel="noreferrer"
        >
          <Puzzle />
          <span>{t("Taktikaufgaben", "Puzzles")}</span>
        </a>
        <a
          className="nav-item"
          href="https://www.chess.com/lessons"
          target="_blank"
          rel="noreferrer"
        >
          <GraduationCap />
          <span>{t("Lernen", "Learn")}</span>
        </a>
        <details className="nav-more">
          <summary>
            <ChevronDown size={17} />
            {t("Mehr", "More")}
          </summary>
          <a
            href="https://github.com/pxnami/Greenchess"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ExternalLink size={13} />
          </a>
          <a href="https://lichess.org" target="_blank" rel="noreferrer">
            Lichess <ExternalLink size={13} />
          </a>
        </details>
      </nav>
      <div className="sidebar-bottom">
        <button
          className="language"
          onClick={() => setLang(lang === "de" ? "en" : "de")}
          aria-label="Change language"
        >
          {lang === "de" ? "Deutsch" : "English"}
          <span>{lang === "de" ? "EN" : "DE"}</span>
        </button>
        <span className="independent">
          {t("Unabhängige Analyse", "Independent analysis")}
        </span>
      </div>
    </header>
  );
}
