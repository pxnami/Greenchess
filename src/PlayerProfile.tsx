import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  LoaderCircle,
  Search,
  Trophy,
} from "lucide-react";
import {
  fetchChessComProfile,
  fetchGamePage,
  ImportError,
  type ChessComProfile,
  type ChessComStats,
  type GameCursor,
  type RemoteGame,
} from "./api";
import type { Lang } from "./chess";
import { pieceImage, themeAssets, type PieceTheme } from "./theme";

type Props = {
  lang: Lang;
  boardTheme: string;
  pieceTheme: PieceTheme;
  initialUsername?: string;
  onLoad: (pgn: string, avatars?: { white?: string; black?: string }, usernames?: { white: string; black: string }) => void;
};
type PlayerData = { profile: ChessComProfile; stats?: ChessComStats };
const formats = ["all", "bullet", "blitz", "rapid", "daily"] as const;
type Format = (typeof formats)[number];

function dateLabel(date: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function MiniBoard({ pgn, boardTheme, pieceTheme }: { pgn: string; boardTheme: string; pieceTheme: PieceTheme }) {
  const squares = new Chess();
  try {
    squares.loadPgn(pgn);
  } catch {
    squares.reset();
  }
  const position = squares.board();
  return (
    <div
      className={`profile-mini-board board-theme-${boardTheme}`}
      aria-hidden="true"
    >
      {position.flatMap((row, rank) =>
        row.map((piece, file) => (
          <span
            className={`square ${(rank + file) % 2 ? "dark" : "light"}`}
            key={`${rank}-${file}`}
          >
            {piece && (
              <img
                src={pieceImage(piece.color, piece.type, pieceTheme)}
                alt=""
                loading="lazy"
              />
            )}
          </span>
        )),
      )}
    </div>
  );
}

export function PlayerProfile({
  lang,
  boardTheme,
  pieceTheme,
  initialUsername = "",
  onLoad,
}: Props) {
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const [query, setQuery] = useState(initialUsername);
  const [player, setPlayer] = useState<PlayerData>();
  const [games, setGames] = useState<RemoteGame[]>([]);
  const [cursor, setCursor] = useState<GameCursor>();
  const [format, setFormat] = useState<Format>("all");
  const [section, setSection] = useState<"overview" | "games" | "stats">(
    "overview",
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const controller = useRef<AbortController | undefined>(undefined);
  const requestId = useRef(0);
  const searches = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      searches.current?.abort();
      controller.current?.abort();
    },
    [],
  );

  async function search(value = query) {
    const username = value.trim();
    if (!username) return;
    controller.current?.abort();
    searches.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setPlayer(undefined);
    setGames([]);
    setCursor(undefined);
    setSection("overview");
    try {
      const data = await fetchChessComProfile(username, abort.signal);
      if (requestId.current !== id) return;
      setPlayer(data);
      const page = await fetchGamePage("chesscom", data.profile.username, {
        signal: abort.signal,
      });
      if (requestId.current !== id) return;
      setGames(page.games);
      setCursor(page.next);
    } catch (cause) {
      if (abort.signal.aborted || requestId.current !== id) return;
      setError(message(cause));
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }

  function message(cause: unknown) {
    if (cause instanceof ImportError) {
      if (cause.code === "profile")
        return t(
          "Profil nicht gefunden. Prüfe den Chess.com-Benutzernamen.",
          "Profile not found. Check the Chess.com username.",
        );
      if (cause.code === "rate")
        return t(
          "Chess.com begrenzt gerade Anfragen. Bitte später erneut versuchen.",
          "Chess.com is limiting requests. Please try again later.",
        );
      if (cause.code === "timeout")
        return t(
          "Chess.com antwortet zu langsam. Bitte erneut versuchen.",
          "Chess.com is taking too long to respond. Please try again.",
        );
    }
    return t(
      "Profil oder Partien konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.",
      "Could not load the profile or games. Check your connection and try again.",
    );
  }

  async function loadMore() {
    if (!player || !cursor || loadingMore) return;
    const abort = new AbortController();
    searches.current = abort;
    setLoadingMore(true);
    setError("");
    try {
      const page = await fetchGamePage("chesscom", player.profile.username, {
        cursor,
        signal: abort.signal,
      });
      setGames((previous) => {
        const ids = new Set(previous.map((game) => game.id));
        return [...previous, ...page.games.filter((game) => !ids.has(game.id))];
      });
      setCursor(page.next);
    } catch (cause) {
      if (!abort.signal.aborted) setError(message(cause));
    } finally {
      if (searches.current === abort) setLoadingMore(false);
    }
  }

  const ratings = [
    ["Bullet", player?.stats?.chess_bullet],
    ["Blitz", player?.stats?.chess_blitz],
    [t("Schnellschach", "Rapid"), player?.stats?.chess_rapid],
    [t("Fernschach", "Daily"), player?.stats?.chess_daily],
  ] as const;
  const filteredGames = games.filter(
    (game) => format === "all" || game.timeClass === format,
  );
  const profile = player?.profile;
  const joined = profile?.joined
    ? new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.joined * 1000))
    : undefined;
  const lastOnline = profile?.last_online
    ? new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", {
        dateStyle: "medium",
      }).format(new Date(profile.last_online * 1000))
    : undefined;

  return (
    <main className="profile-main">
      <div className="profile-content">
        <header className="profile-search-header">
          <div>
            <p className="profile-eyebrow">
              <img src={themeAssets.chessComPlayIcon} alt="" /> KNIGHTLENS ·
              CHESS.COM
            </p>
            <h1>{t("Spielersuche", "Player search")}</h1>
            <p>
              {t(
                "Öffentliche Profile, Ratings und Partien ansehen.",
                "Browse public profiles, ratings, and games.",
              )}
            </p>
          </div>
          <form
            className="profile-search"
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
          >
            <label className="sr-only" htmlFor="chesscom-player">
              {t(
                "Chess.com-Benutzername oder Profil-URL",
                "Chess.com username or profile URL",
              )}
            </label>
            <Search size={18} aria-hidden="true" />
            <input
              id="chesscom-player"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(
                "Benutzername oder chess.com/member/…",
                "Username or chess.com/member/…",
              )}
              autoComplete="off"
            />
            <button
              className="primary"
              type="submit"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                t("Suchen", "Search")
              )}
            </button>
          </form>
        </header>

        {error && (
          <p className="error profile-error" role="alert">
            {error}
          </p>
        )}
        {loading && !profile && (
          <div className="profile-loading" role="status">
            <LoaderCircle className="spin" />
            {t(
              "Öffentliches Profil wird geladen …",
              "Loading public profile …",
            )}
          </div>
        )}

        {profile && (
          <>
            <section className="profile-identity">
              <div className="profile-avatar">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = pieceImage("w", "n");
                    }}
                  />
                ) : (
                  <img src={pieceImage("w", "n")} alt="" />
                )}
              </div>
              <div className="profile-person">
                <div className="profile-name-line">
                  <h2>{profile.username}</h2>
                  {profile.title && (
                    <span className="profile-title">{profile.title}</span>
                  )}
                  {profile.is_verified && <span className="verified">✓</span>}
                </div>
                {profile.name && (
                  <p className="profile-real-name">{profile.name}</p>
                )}
                <p className="profile-meta">
                  {[
                    profile.location,
                    joined && `${t("Dabei seit", "Joined")} ${joined}`,
                    typeof profile.followers === "number" &&
                      `${profile.followers.toLocaleString()} ${t("Follower", "followers")}`,
                    lastOnline &&
                      `${t("Zuletzt online", "Last online")} ${lastOnline}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <a
                href={profile.url}
                target="_blank"
                rel="noreferrer"
                className="profile-open"
              >
                <img src={themeAssets.chessComPlayIcon} alt="" />{" "}
                {t("Chess.com-Profil", "Chess.com profile")}{" "}
                <ArrowUpRight size={16} />
              </a>
              <nav
                className="profile-tabs"
                aria-label={t("Profilbereiche", "Profile sections")}
              >
                {(
                  [
                    ["overview", t("Übersicht", "Overview")],
                    ["games", t("Partien", "Games")],
                    ["stats", t("Statistiken", "Statistics")],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    className={section === id ? "active" : ""}
                    onClick={() => setSection(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </section>

            {(section === "overview" || section === "stats") && (
              <section
                className="profile-ratings"
                aria-label={t("Spielstärken", "Ratings")}
              >
                {ratings.map(([label, rating]) => (
                  <article className="rating-card" key={label}>
                    <div className="rating-heading">
                      <Trophy size={17} />
                      <span>{label}</span>
                    </div>
                    <strong>
                      {rating?.last?.rating?.toLocaleString() ?? "—"}
                    </strong>
                    <div className="rating-record">
                      {rating?.record ? (
                        <>
                          {rating.record.win ?? 0} {t("Siege", "wins")} ·{" "}
                          {rating.record.draw ?? 0} {t("Remis", "draws")} ·{" "}
                          {rating.record.loss ?? 0} {t("Niederlagen", "losses")}
                        </>
                      ) : (
                        t("Keine öffentlichen Daten", "No public data")
                      )}
                    </div>
                    {rating?.best?.rating && (
                      <small>
                        {t("Bestwert", "Peak")}:{" "}
                        {rating.best.rating.toLocaleString()}
                      </small>
                    )}
                  </article>
                ))}
              </section>
            )}

            {(section === "overview" || section === "games") && (
              <section className="profile-games-section">
                <div className="profile-section-heading">
                  <div>
                    <h2>
                      {section === "overview"
                        ? t("Letzte Partien", "Recent games")
                        : t("Partien", "Games")}
                    </h2>
                    <p>
                      {t(
                        "Öffentliche Standardpartien aus dem Chess.com-Archiv",
                        "Public standard games from the Chess.com archive",
                      )}
                    </p>
                  </div>
                  <div className="profile-layout-toggle">
                    <button
                      aria-pressed={layout === "grid"}
                      onClick={() => setLayout("grid")}
                    >
                      {t("Bretter", "Boards")}
                    </button>
                    <button
                      aria-pressed={layout === "list"}
                      onClick={() => setLayout("list")}
                    >
                      {t("Liste", "List")}
                    </button>
                  </div>
                </div>
                <div
                  className="profile-filters"
                  role="group"
                  aria-label={t("Zeitformat filtern", "Filter by time control")}
                >
                  {formats.map((value) => (
                    <button
                      key={value}
                      className={format === value ? "active" : ""}
                      onClick={() => setFormat(value)}
                    >
                      {value === "all"
                        ? t("Alle", "All")
                        : value[0].toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
                {loading && (
                  <p className="profile-loading inline" role="status">
                    <LoaderCircle className="spin" size={17} />
                    {t("Partien werden geladen …", "Loading games …")}
                  </p>
                )}
                {!loading && filteredGames.length === 0 && (
                  <p className="profile-no-games">
                    {games.length
                      ? t(
                          "Für dieses Zeitformat sind auf der geladenen Seite keine Partien dabei.",
                          "No games in this time control on the loaded page.",
                        )
                      : t(
                          "Keine öffentlichen Partien gefunden.",
                          "No public games found.",
                        )}
                  </p>
                )}
                <div className={`profile-game-grid ${layout}`}>
                  {filteredGames.map((game, index) => {
                    const title = `${game.white} ${game.result} ${game.black}`;
                    const loadGame = () => onLoad(
                      game.pgn,
                      {
                        white: game.white.toLowerCase() === profile.username.toLowerCase() ? profile.avatar : undefined,
                        black: game.black.toLowerCase() === profile.username.toLowerCase() ? profile.avatar : undefined,
                      },
                      { white: game.white, black: game.black },
                    );
                    return (
                      <article
                        className="profile-game-card"
                        key={game.id ?? index}
                      >
                        <button
                          className="profile-game-load"
                          onClick={loadGame}
                          aria-label={`${t("Partie analysieren", "Analyze game")}: ${title}`}
                        >
                          <MiniBoard pgn={game.pgn} boardTheme={boardTheme} pieceTheme={pieceTheme} />
                        </button>
                        <div className="profile-game-info">
                          <span className="profile-time-class">
                            {game.timeClass?.toUpperCase() ||
                              t("PARTIE", "GAME")}
                          </span>
                          <strong>
                            {game.white} <span>{game.result}</span> {game.black}
                          </strong>
                          <small>{dateLabel(game.date, lang)}</small>
                          <div>
                            <button
                              className="text-button"
                              onClick={loadGame}
                            >
                              {t("Analysieren", "Analyze game")}{" "}
                              <ArrowUpRight size={14} />
                            </button>
                            {game.url && (
                              <a
                                href={game.url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={t(
                                  "Partie auf Chess.com öffnen",
                                  "Open game on Chess.com",
                                )}
                              >
                                <ArrowUpRight size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {cursor && (
                  <button
                    className="profile-load-more"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <ArrowDownToLine size={17} />
                    )}
                    {t("Ältere Partien laden", "Load older games")}
                  </button>
                )}
                {!cursor && games.length > 0 && (
                  <p className="profile-end-note">
                    {t(
                      "Alle aktuell verfügbaren Partien wurden geladen.",
                      "All currently available games have been loaded.",
                    )}
                  </p>
                )}
              </section>
            )}

            <p className="profile-source-note">
              {t(
                "Daten stammen aus dem öffentlichen Chess.com-API. Profile und Partien müssen öffentlich sein; die API kann zwischengespeicherte Daten liefern.",
                "Data comes from Chess.com's public API. Profiles and games must be public; the API may serve cached data.",
              )}
            </p>
          </>
        )}

        {!profile && !loading && !error && (
          <section className="profile-empty">
            <img src={pieceImage("w", "n")} alt="" />
            <h2>{t("Finde einen Spieler", "Find a player")}</h2>
            <p>
              {t(
                "Suche mit dem Chess.com-Benutzernamen oder füge einen Profil-Link ein.",
                "Search by Chess.com username or paste a profile link.",
              )}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
