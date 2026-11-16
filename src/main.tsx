import { Sidebar } from "./Sidebar";
import { Coach } from "./Coach";
import { pieceImage, themeAssets, boardThemes, pieceThemes, type BoardTheme, type PieceTheme } from "./theme";
import { PlayerProfile } from "./PlayerProfile";
import { ImportDialog } from "./ImportDialog";
import { EvaluationGraph } from "./EvaluationGraph";
import { Overview } from "./Overview";
import { MoveList } from "./MoveList";
import { MoveBadge } from "./MoveBadge";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Chess, type Square } from "chess.js";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCw,
  Download,
  BookOpen,
  ChartNoAxesCombined,
  Settings,
  X,
} from "lucide-react";
import {
  parseGame,
  formatEvaluation,
  type Game,
  type Lang,
  type Review,
  type Position,
} from "./chess";
import { Engine } from "./engine";
import { analyzeGame } from "./analysis";
import { fetchChessComProfile } from "./api";

import "./style.css";
import "./chesscom.css";

function restoreGame(): Game | undefined {
  try {
    const pgn = sessionStorage.getItem("knightlens-game");
    return pgn ? parseGame(pgn) : undefined;
  } catch {
    return undefined;
  }
}
function App() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => undefined);
  }, []);
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem("knightlens-language") === "en" ? "en" : "de";
    } catch {
      return "de";
    }
  });
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [game, setGame] = useState<Game | undefined>(restoreGame);
  const [ply, setPly] = useState(0),
    [flipped, setFlipped] = useState(false),
    [playing, setPlaying] = useState(false);
  const [importing, setImporting] = useState(false),
    [error, setError] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]),
    [positions, setPositions] = useState<Position[]>([]),
    [busy, setBusy] = useState(false),
    [depth, setDepth] = useState(18),
    [progress, setProgress] = useState(0);
  const [fullEngine, setFullEngine] = useState(() => {
    try { return localStorage.getItem("knightlens-lite-engine") !== "true"; }
    catch { return true; }
  });
  const [quickMode, setQuickMode] = useState(false);
  const savedEngineSettings = useRef<{ fullEngine: boolean; depth: number } | undefined>(undefined);
  const [analysisStage, setAnalysisStage] = useState("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [surface, setSurface] = useState<"analysis" | "profile">("analysis");
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => {
    try {
      const saved = localStorage.getItem("knightlens-board-theme") as BoardTheme | null;
      return saved && boardThemes.includes(saved) ? saved : "ice";
    } catch {
      return "ice";
    }
  });
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>(() => {
    try {
      const saved = localStorage.getItem("knightlens-piece-theme") as PieceTheme | null;
      return saved && pieceThemes.includes(saved) ? saved : "neo";
    } catch { return "neo"; }
  });
  const [tab, setTab] = useState("moves"),
    [explaining, setExplaining] = useState(false),
    [showBest, setShowBest] = useState(false),
    [variation, setVariation] = useState<{ fen: string; san: string }>();
  const [selected, setSelected] = useState<Square>();
  const [draggingPiece, setDraggingPiece] = useState<{ color: "w" | "b"; type: string; x: number; y: number }>();
  const engine = useRef<Engine | null>(null),
    run = useRef(0);
  const fen = variation?.fen || game?.fens[ply] || new Chess().fen();
  const board = new Chess(fen),
    move = game?.moves[ply - 1],
    review = reviews[ply - 1],
    position = positions[ply];
  const score = variation ? "—" : formatEvaluation(position);
  const changePly = (next: number) => {
    setPlaying(false);
    setPly(Math.max(0, Math.min(game?.moves.length || 0, next)));
    setVariation(undefined);
    setSelected(undefined);
    setExplaining(false);
  };
  function cancel() {
    run.current++;
    engine.current?.stop();
    engine.current = null;
    setBusy(false);
    setAnalysisStage("stopped");
  }
  useEffect(
    () => () => {
      engine.current?.stop();
    },
    [],
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("knightlens-language", lang);
    } catch {
      /* Preference storage is optional. */
    }
  }, [lang]);
  useEffect(() => {
    try {
      localStorage.setItem("knightlens-board-theme", boardTheme);
    } catch {
      /* Preference storage is optional. */
    }
  }, [boardTheme]);
  useEffect(() => {
    try {
      localStorage.setItem("knightlens-piece-theme", pieceTheme);
      localStorage.setItem("knightlens-lite-engine", String(!fullEngine));
    } catch { /* Preferences are optional. */ }
  }, [pieceTheme, fullEngine]);
  useEffect(() => {
    document.title = game
      ? `${game.headers.White || "White"} vs. ${game.headers.Black || "Black"} | KnightLens`
      : "KnightLens — Chess, understood.";
  }, [game]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setPly((p) => {
          if (p >= (game?.moves.length || 0)) {
            setPlaying(false);
            return p;
          }
          return p + 1;
        }),
      900,
    );
    return () => clearInterval(id);
  }, [playing, game]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target as HTMLElement).isContentEditable ||
        (e.target as HTMLElement).closest("input,textarea,select") ||
        importing
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        changePly(ply + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        changePly(ply - 1);
      }
      if (e.key === "Home") changePly(0);
      if (e.key === "End") changePly(game?.moves.length || 0);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ply, game, importing]);
  useEffect(() => {
    const active = document.querySelector<HTMLElement>(".move.active");
    const table = active?.closest<HTMLElement>(".move-table");
    if (active && table) {
      const a = active.getBoundingClientRect(),
        b = table.getBoundingClientRect();
      if (a.bottom > b.bottom) table.scrollTop += a.bottom - b.bottom;
      if (a.top < b.top + 30) table.scrollTop -= b.top + 30 - a.top;
    }
  }, [ply]);
  function load(parsed: Game) {
    cancel();
    setGame(parsed);
    try {
      sessionStorage.setItem("knightlens-game", parsed.pgn);
    } catch {}
    setSelected(undefined);
    setExplaining(false);
    setAnalysisStage("idle");
    setPly(0);
    setReviews([]);
    setPositions([]);
    setProgress(0);
    setImporting(false);
    setPlaying(false);
    setVariation(undefined);
    setError("");
  }
  async function analyze() {
    if (!game) return;
    cancel();
    const id = run.current;
    const worker = new Engine(fullEngine);
    engine.current = worker;
    setBusy(true);
    setPlaying(false);
    setError("");
    setReviews([]);
    setPositions([]);
    setProgress(0);
    setTab("moves");
    setAnalysisStage("loading");
    try {
      await worker.init();
      if (run.current !== id) return;
      setAnalysisStage("analyzing");
      await analyzeGame(game, worker, depth, (update) => {
        if (run.current !== id) return;
        setPositions(update.positions);
        setReviews(update.reviews);
        setProgress(update.reviews.length / game.moves.length);
      });
      if (run.current === id) {
        setAnalysisStage("complete");
        setTab("overview");
        setBusy(false);
        worker.stop();
        engine.current = null;
      }
    } catch (error) {
      if (run.current === id) {
        setAnalysisStage("error");
        setError(
          t(
            "Die Analyse wurde unterbrochen. Bereits ausgewertete Züge bleiben sichtbar. Prüfe die Verbindung und starte erneut.",
            "Analysis was interrupted. Completed moves remain visible. Check your connection and start again.",
          ),
        );
        setBusy(false);
        worker.stop();
        engine.current = null;
      }
    }
  }
  const white = game?.headers.White || t("Weiß", "White"),
    black = game?.headers.Black || t("Schwarz", "Black");
  const accuracy = (color: string) => {
    const rs = reviews.filter((_, i) => game?.moves[i].color === color);
    return rs.length
      ? (rs.reduce((s, r) => s + r.accuracy, 0) / rs.length).toFixed(1)
      : "—";
  };
  const badge = (r: Review) => {
    return <MoveBadge category={r.category} lang={lang} />;
  };
  function download() {
    if (!game) return;
    const url = URL.createObjectURL(
      new Blob([game.pgn], { type: "application/x-chess-pgn" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "knightlens.pgn";
    a.click();
    URL.revokeObjectURL(url);
  }
  function movePiece(from: Square, to: Square) {
    if (!game) return;
    try {
      const candidate = new Chess(fen);
      const result = candidate.move({ from, to, promotion: "q" });
      setVariation({ fen: candidate.fen(), san: result.san });
      setSelected(undefined);
      setPlaying(false);
    } catch {
      setSelected(undefined);
    }
  }
  function squareClick(square: Square) {
    if (!game) return;
    if (selected && legal.includes(square)) {
      movePiece(selected, square);
      return;
    }
    if (board.get(square)?.color === board.turn()) setSelected(square);
    else setSelected(undefined);
  }
  function toggleQuickMode() {
    if (quickMode) {
      const previous = savedEngineSettings.current;
      if (previous) {
        setFullEngine(previous.fullEngine);
        setDepth(previous.depth);
      }
      savedEngineSettings.current = undefined;
      setQuickMode(false);
      return;
    }
    savedEngineSettings.current = { fullEngine, depth };
    setFullEngine(false);
    setDepth(12);
    setQuickMode(true);
  }
  const squares = Array.from(
    { length: 64 },
    (_, i) =>
      `${"abcdefgh"[flipped ? 7 - (i % 8) : i % 8]}${flipped ? 1 + Math.floor(i / 8) : 8 - Math.floor(i / 8)}` as Square,
  );
  const arrow =
    showBest && positions[ply]?.best && !variation
      ? positions[ply].best
      : undefined;
  const center = (square: string) => {
    const i = squares.indexOf(square as Square);
    return [(i % 8) * 12.5 + 6.25, Math.floor(i / 8) * 12.5 + 6.25];
  };
  const arrowFrom = arrow ? center(arrow.slice(0, 2)) : [],
    arrowTo = arrow ? center(arrow.slice(2, 4)) : [];
  const legal = selected
    ? board.moves({ square: selected, verbose: true }).map((m) => m.to)
    : [];
  useEffect(() => {
    if (!draggingPiece) return;
    const movePreview = (event: PointerEvent) =>
      setDraggingPiece((piece) => piece ? { ...piece, x: event.clientX, y: event.clientY } : undefined);
    const clearPreview = () => setDraggingPiece(undefined);
    window.addEventListener("pointermove", movePreview);
    window.addEventListener("pointerup", clearPreview, { once: true });
    window.addEventListener("dragend", clearPreview, { once: true });
    return () => {
      window.removeEventListener("pointermove", movePreview);
      window.removeEventListener("pointerup", clearPreview);
      window.removeEventListener("dragend", clearPreview);
    };
  }, [draggingPiece]);
  const player = (name: string, color: string) => (
    <div className="player">
      <div className={`player-piece ${color}`}>
        {game?.avatars?.[color === "w" ? "white" : "black"] ? (
          <img src={game.avatars[color === "w" ? "white" : "black"]} alt="" />
        ) : <img src={pieceImage(color, "p", pieceTheme)} alt="" />}
      </div>
      <div>
        <strong>{name}</strong>
        <small>
          {color === "w" ? t("Weiß", "White") : t("Schwarz", "Black")}
          {game?.headers[color === "w" ? "WhiteElo" : "BlackElo"]
            ? ` · ${game.headers[color === "w" ? "WhiteElo" : "BlackElo"]}`
            : ""}
        </small>
      </div>
      <span className="player-result">{game?.headers.Result || "—"}</span>
    </div>
  );
  return (
    <>
      <Sidebar
        lang={lang}
        tab={surface === "profile" ? "profile" : tab}
        setLang={setLang}
        onImport={() => {
          setSurface("analysis");
          setImporting(true);
          setError("");
        }}
        onMoves={() => { setSurface("analysis"); setTab("moves"); }}
        onOverview={() => { setSurface("analysis"); setTab("overview"); }}
        onProfile={() => { setSurface("profile"); setImporting(false); }}
      />
      {surface === "profile" ? (
        <PlayerProfile
          lang={lang}
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          onLoad={(pgn, avatars, usernames) => {
            try {
              const parsed = parseGame(pgn);
              parsed.avatars = { ...avatars };
              load(parsed);
              setSurface("analysis");
              if (usernames) {
                const missing = usernames.white.toLowerCase() === parsed.headers.White?.toLowerCase() ? "black" : "white";
                const opponent = usernames[missing];
                void fetchChessComProfile(opponent).then(({ profile }) => {
                  if (!profile.avatar) return;
                  setGame((current) => current?.pgn === parsed.pgn
                    ? { ...current, avatars: { ...current.avatars, [missing]: profile.avatar } }
                    : current);
                }).catch(() => undefined);
              }
            } catch {
              setError(t("Diese Partie kann nicht geladen werden.", "This game could not be loaded."));
            }
          }}
        />
      ) : <main>
        <div className="workspace">
          <section
            className="board-column"
            aria-label={t("Schachbrett", "Chessboard")}
          >
            {player(flipped ? white : black, flipped ? "w" : "b")}
            <div className="board-frame">
              <div
                className="eval-bar"
                title={t(
                  "Bewertung aus Sicht von Weiß",
                  "Evaluation from White’s perspective",
                )}
              >
                <div
                  className="eval-white"
                  style={{
                    height: `${position ? 100 / (1 + Math.exp(-position.cp / 400)) : 50}%`,
                  }}
                />
                <span>{score}</span>
              </div>
              <div
                className={`board board-theme-${boardTheme}${flipped ? " flipped" : ""}`}
                style={{ backgroundImage: boardTheme === "ice" ? `url(${themeAssets.board})` : undefined }}
              >
                {squares.map((sq, i) => {
                  const piece = board.get(sq);
                  return (
                    <button
                      key={sq}
                      className={`square ${(Number(sq[1]) + sq.charCodeAt(0)) % 2 === 0 ? "dark" : "light"} ${move && (move.from === sq || move.to === sq) && !variation ? "last" : ""} ${selected === sq ? "selected" : ""}`}
                      onClick={() => squareClick(sq)}
                      draggable={Boolean(game && piece?.color === board.turn())}
                      onDragStart={(event) => {
                        if (!piece || piece.color !== board.turn() || !game) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.setData("text/plain", sq);
                        event.dataTransfer.effectAllowed = "move";
                        const transparent = new Image(1, 1);
                        transparent.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                        event.dataTransfer.setDragImage(transparent, 0, 0);
                        const rect = event.currentTarget.getBoundingClientRect();
                        setDraggingPiece({ color: piece.color, type: piece.type, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                        setSelected(sq);
                      }}
                      onDragOver={(event) => {
                        if (selected && legal.includes(sq)) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = event.dataTransfer.getData("text/plain") as Square;
                        if (from && legal.includes(sq)) movePiece(from, sq);
                      }}
                      title={piece?.color === board.turn() ? t("Ziehen oder anklicken", "Drag or click") : undefined}
                      aria-label={`${sq}${piece ? " " + piece.color + piece.type : ""}`}
                    >
                      <span className="rank">{i % 8 === 0 ? sq[1] : ""}</span>
                      <span className="file">{i >= 56 ? sq[0] : ""}</span>
                      {piece && (
                        <img
                          draggable={false}
                          src={pieceImage(piece.color, piece.type, pieceTheme)}
                          alt={`${piece.color}${piece.type}`}
                        />
                      )}{" "}
                      {legal.includes(sq) && <span className="legal-dot" />}
                      {move?.to === sq && review && !variation && (
                        <MoveBadge category={review.category} lang={lang} className="board-badge" />
                      )}
                    </button>
                  );
                })}
                {arrow && (
                  <svg className="arrows" viewBox="0 0 100 100">
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="4"
                        markerHeight="4"
                        refX="2"
                        refY="2"
                        orient="auto"
                      >
                        <path d="M0 0 L4 2 L0 4z" fill="#e5ba58" />
                      </marker>
                    </defs>
                    <line
                      x1={arrowFrom[0]}
                      y1={arrowFrom[1]}
                      x2={arrowTo[0]}
                      y2={arrowTo[1]}
                      stroke="#e5ba58"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead)"
                      opacity=".85"
                    />
                  </svg>
                )}
                {!game && (
                  <div className="board-empty">
                    <BookOpen size={28} />
                    <strong>
                      {t(
                        "Deine Partie beginnt hier.",
                        "Your game starts here.",
                      )}
                    </strong>
                    <span>
                      {t(
                        "Importiere eine Partie für deine Analyse.",
                        "Import a game to start your review.",
                      )}
                    </span>
                  </div>
                )}
              </div>
              {draggingPiece && (
                <img
                  className="drag-piece-preview"
                  src={pieceImage(draggingPiece.color, draggingPiece.type as "p" | "n" | "b" | "r" | "q" | "k", pieceTheme)}
                  alt=""
                  aria-hidden="true"
                  style={{ left: draggingPiece.x, top: draggingPiece.y }}
                />
              )}
            </div>
            {player(flipped ? black : white, flipped ? "b" : "w")}
            <div className="board-toolbar">
              <button
                onClick={() => setFlipped(!flipped)}
                title={t("Brett drehen", "Flip board")}
              >
                <RotateCw size={17} />
              </button>
              <span>
                {variation
                  ? t("Variante", "Variation") + ": " + variation.san
                  : `${ply} / ${game?.moves.length || 0} ${t("Halbzüge", "plies")}`}
              </span>
              {variation && (
                <button onClick={() => setVariation(undefined)}>
                  {t("Zurück zur Partie", "Back to game")}
                </button>
              )}

              <button
                disabled={!game}
                onClick={download}
                title={t("PGN herunterladen", "Download PGN")}
              >
                <Download size={17} />
              </button>
            </div>
            <div className="board-note">
              <span className="status-dot" />
              {t(
                "Analyse auf deinem Gerät. Deine PGN bleibt privat.",
                "On-device analysis. Your PGN stays private.",
              )}
              <span className="keyboard-hint">
                ← → {t("zum Navigieren", "to navigate")}
              </span>
            </div>
          </section>
          <aside className="analysis-panel" data-view={tab}>
            <div className="panel-heading">
              <img className="analysis-logo" src={themeAssets.analysisIcon} alt="" />
              <h2>{t("Partieanalyse", "Game review")}</h2>
              <span className="engine-badge">
                Stockfish 19 {fullEngine ? "NNUE" : "Lite"} · {depth}
              </span>
              <button
                className="settings-button"
                onClick={() => setShowSettings(!showSettings)}
                aria-expanded={showSettings}
                aria-label={t("Analyseeinstellungen", "Analysis settings")}
              >
                <Settings size={18} />
              </button>
            </div>
            <Coach
              game={game}
              ply={ply}
              review={review}
              lang={lang}
              score={score}
              variation={variation?.san}
              explaining={explaining}
              setExplaining={setExplaining}
              onNext={() => changePly(ply + 1)}
            />
            {showSettings && (
              <div className="engine-settings">
                <button
                  className={`quick-mode${quickMode ? " active" : ""}`}
                  type="button"
                  disabled={busy}
                  aria-pressed={quickMode}
                  onClick={toggleQuickMode}
                >
                  {quickMode
                    ? t("Schnellmodus aktiv · Lite · Tiefe 12", "Quick mode on · Lite · Depth 12")
                    : t("Schnellmodus · Lite · Tiefe 12", "Quick mode · Lite · Depth 12")}
                </button>
                <label className="engine-choice">
                  <input
                    type="checkbox"
                    checked={fullEngine}
                    disabled={busy}
                    onChange={(e) => { setQuickMode(false); savedEngineSettings.current = undefined; setFullEngine(e.target.checked); }}
                  />
                  {t(
                    "Volle NNUE-Engine laden (95 MB)",
                    "Load full NNUE engine (95 MB)",
                  )}
                </label>
                <div className="analysis-controls">
                  <label>
                    {t("Analysetiefe", "Analysis depth")}
                    <select
                      value={depth}
                      disabled={busy}
                      onChange={(e) => { setQuickMode(false); savedEngineSettings.current = undefined; setDepth(Number(e.target.value)); }}
                    >
                      <option value={12}>12 · {t("Schnell", "Quick")}</option>
                      <option value={16}>
                        16 · {t("Standard", "Standard")}
                      </option>
                      <option value={18}>18 · {t("Gründlich", "Deep")}</option>
                      <option value={22}>
                        22 · {t("Sehr gründlich", "Very deep")}
                      </option>
                      <option value={24}>24 · {t("Maximal", "Maximum")}</option>
                    </select>
                  </label>
                  <label>
                    {t("Brett", "Board")}
                    <select
                      value={boardTheme}
                      onChange={(e) => setBoardTheme(e.target.value as BoardTheme)}
                    >
                      <option value="ice">{t("Eis", "Icy sea")}</option>
                      <option value="wood">{t("Holz", "Wood")}</option>
                      <option value="classic">{t("Klassisch", "Classic")}</option>
                      <option value="forest">{t("Wald", "Forest")}</option>
                      <option value="slate">{t("Schiefer", "Slate")}</option>
                      <option value="rose">{t("Rosé", "Rose")}</option>
                    </select>
                  </label>
                  <label>
                    {t("Figurenstil", "Piece set")}
                    <select value={pieceTheme} onChange={(e) => setPieceTheme(e.target.value as PieceTheme)}>
                      <option value="neo">NEO</option>
                      <option value="classic">Classic</option>
                      <option value="neo_wood">NEO Wood</option>
                      <option value="alpha">Alpha</option>
                      <option value="merida">Merida</option>
                    </select>
                  </label>
                </div>
              </div>
            )}{" "}
            {busy && (
              <div className="progress" role="status">
                <div style={{ width: `${progress * 100}%` }} />
                <span>
                  {analysisStage === "loading"
                    ? t(
                        fullEngine
                          ? "Lade volle Stockfish-Engine (95 MB) …"
                          : "Lade Stockfish Lite (1,7 MB) …",
                        fullEngine
                          ? "Loading full Stockfish engine (95 MB) …"
                          : "Loading Stockfish Lite (1.7 MB) …",
                      )
                    : `${t("Analysiere", "Analyzing")} ${reviews.length}/${game?.moves.length} · ${Math.round(progress * 100)}%`}
                </span>
              </div>
            )}
            {!importing && error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!busy &&
              reviews.length > 0 &&
              reviews.length < (game?.moves.length || 0) && (
                <p className="analysis-status" role="status">
                  {t("Teilweise analysiert", "Partially analyzed")}:{" "}
                  {reviews.length}/{game?.moves.length}
                </p>
              )}
            <div className="tabs">
              <button
                className={tab === "moves" ? "active" : ""}
                onClick={() => setTab("moves")}
              >
                <BookOpen size={16} />
                {t("Züge", "Moves")}
              </button>
              <button
                className={tab === "overview" ? "active" : ""}
                onClick={() => setTab("overview")}
              >
                <ChartNoAxesCombined size={16} />
                {t("Übersicht", "Overview")}
              </button>
            </div>
            {tab === "moves" ? (
              <MoveList
                t={t}
                game={game}
                ply={ply}
                reviews={reviews}
                positions={positions}
                badge={badge}
                changePly={changePly}
                setPlaying={setPlaying}
                showBest={showBest}
                setShowBest={setShowBest}
              />
            ) : (
              <Overview
                t={t}
                white={white}
                black={black}
                accuracy={accuracy}
                lang={lang}
                reviews={reviews}
                game={game}
                avatars={game?.avatars}
                pieceTheme={pieceTheme}
                ply={ply}
                changePly={changePly}
                setTab={setTab}
              />
            )}
            <EvaluationGraph
              t={t}
              positions={positions}
              reviews={reviews}
              ply={ply}
              changePly={changePly}
            />
            <div className="review-playback">
              <div className="playback">
                <button
                  disabled={!game || ply === 0}
                  onClick={() => changePly(0)}
                  aria-label={t("Anfang", "First")}
                >
                  <ChevronFirst size={19} />
                </button>
                <button
                  disabled={!game || ply === 0}
                  onClick={() => changePly(ply - 1)}
                  aria-label={t("Zurück", "Previous")}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  disabled={!game}
                  className="play"
                  onClick={() => {
                    setVariation(undefined);
                    if (ply === game?.moves.length) setPly(0);
                    setPlaying(!playing);
                  }}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  disabled={!game || ply === game.moves.length}
                  onClick={() => changePly(ply + 1)}
                  aria-label={t("Weiter", "Next")}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  disabled={!game || ply === game.moves.length}
                  onClick={() => changePly(game?.moves.length || 0)}
                  aria-label={t("Ende", "Last")}
                >
                  <ChevronLast size={19} />
                </button>
              </div>
            </div>
            <div className="review-start">
              {" "}
              <button
                className="primary analyze"
                disabled={!game}
                onClick={busy ? cancel : analyze}
              >
                {busy ? <X size={17} /> : <ChartNoAxesCombined size={17} />}{" "}
                {busy
                  ? t("Stoppen", "Stop")
                  : reviews.length
                    ? t("Neu analysieren", "Analyze again")
                    : t("Analyse starten", "Start analysis")}
              </button>
            </div>{" "}
          </aside>
        </div>
        <footer>
          <span>
            KnightLens <span className="footer-dot">·</span>{" "}
            {t(
              "Schach verstehen, Zug für Zug.",
              "Chess, understood. Move by move.",
            )}
          </span>
          <span>
            {t("Unabhängiges Projekt", "Independent project")} ·{" "}
            <a
              href="https://github.com/nmrugg/stockfish.js/tree/v19.0.0"
              target="_blank"
              rel="noreferrer"
            >
              Stockfish.js · GPLv3
            </a>
          </span>
        </footer>
      </main>}
      {importing && (
        <ImportDialog
          lang={lang}
          setLang={setLang}
          canClose={true}
          onClose={() => setImporting(false)}
          onLoad={load}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
