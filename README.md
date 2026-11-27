<div align="center">
  <img src="public/icon.svg" width="72" height="72" alt="GreenChess icon">

  # GreenChess

  **Chess, understood. Review your games with Stockfish 19 and a coach that explains each move.**

  [![Open GreenChess](https://img.shields.io/badge/Open_GreenChess-81B64C?style=for-the-badge&labelColor=262522)](https://greenchess.de/)
  [![Source](https://img.shields.io/badge/View_source-30372E?style=for-the-badge)](https://github.com/pxnami/Greenchess)
  [![Report issue](https://img.shields.io/badge/Report_issue-DCE0CE?style=for-the-badge&labelColor=262522)](https://github.com/pxnami/Greenchess/issues)

  <sub>English & Deutsch · Local engine · No account or subscription</sub>
</div>

<br>

![GreenChess game analysis](docs/screenshots/desktop.png)

## What it does

Import a PGN, search public Chess.com profiles, or find recent games on Lichess. GreenChess evaluates every position in your browser, marks important moves, and explains the position in German or English.

| Import | Understand | Explore |
| --- | --- | --- |
| Paste PGN or open a PGN file | Ten move categories, from Brilliant to Blunder | Replay with buttons or arrow keys |
| Browse public games and load older ones | Accuracy estimates for both players | Flip the board and show the best move |
| Select games from multi-game PGN files | Position-based coach and engine continuations | Try legal moves and return to the game |
| Chess.com and Lichess profiles | Clickable evaluation graph and category counts | Export the imported PGN |
| Search public Chess.com ratings and archive | Independent move quality estimates | Choose from six board palettes |

Chess.com profile search accepts usernames or profile links and shows available public ratings, profile details, and archived standard games. Its archive loads 20 games at a time; use “Load older games” to continue.

## Interface

<table><tr><td width="72%"><img src="docs/screenshots/desktop.png" alt="Desktop analysis workspace"></td><td width="28%"><img src="docs/screenshots/mobile.png" alt="Mobile analysis workspace"></td></tr></table>

## Analysis

Stockfish.js **19.0.0**, implementing **Stockfish 19**, runs in a Web Worker. The default single-threaded **Full NNUE** engine downloads about 95 MB. Select Lite for a smaller download of about 1.7 MB. These single-threaded builds work on GitHub Pages without cross-origin isolation headers. Search depth is selectable: 12, 16, 18 (default), 22, or 24.

This is the Stockfish 19 engine shown in the supplied Chess.com local-engine settings. GreenChess does not use Chess.com's private server-side review service or its separate Torch engine, so its ratings and move categories can differ from Chess.com. Results also depend on hardware, search time, and thread count.

Move categories and accuracy are **independent estimates**, not Chess.com scores. The played move and preferred alternative are evaluated from the same root position, including game history. Classification uses evaluation loss, a logistic winning-chance estimate, the engine's preferred move and second candidate, a conservative sacrifice heuristic, and a small bundled opening repertoire. Brilliant detects a preferred move offering a higher-value piece for capture while preserving the evaluation; it does not prove a forced sacrifice. Book only recognizes bundled opening prefixes. Accuracy averages a bounded exponential transformation of winning-chance loss. Coach explanations are deterministic and based on actual moves, engine lines and board features; no external AI service is used.

Public profile requests go directly to the respective platform. Both platforms load finished standard games in pages of 20, with an option to load older games. Chess.com searches all available archive months and checks the current month. Requests use the browser's HTTP cache and are serialized per platform; rate limits and upstream availability can affect imports. PGN analysis stays on-device. The interface language and board palette are stored locally. The last imported PGN is stored in session storage for this browser tab; analysis results are recalculated after a reload.

GreenChess is independent and not affiliated with Chess.com or Lichess. Profile search requires an exact username or profile link; the Chess.com public API does not provide fuzzy username search.

## Run locally

Requires Node.js 22 or newer.

```sh
git clone https://github.com/pxnami/Greenchess.git
cd Greenchess
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`.

```sh
npm test             # PGN parsing, rules, grading and coaching tests
npm run typecheck    # TypeScript
npm run build        # Prepare engine assets and build dist/
npm run preview      # Preview production build
```

## Built with

| Area | Technology |
| --- | --- |
| Interface | React, TypeScript, Lucide |
| Chess rules and PGN | chess.js |
| Evaluation | Stockfish.js 19, WebAssembly, Web Workers |
| Build and checks | Vite, TypeScript, Vitest |
| Delivery | GitHub Actions and GitHub Pages at [greenchess.de](https://greenchess.de) |

## Deployment

The [Pages workflow](.github/workflows/pages.yml) installs dependencies, runs tests, builds the app and deploys `dist/` on pushes to `main`. The engine binaries are copied from the pinned npm dependency during the build and are excluded from Git. No environment variables or secrets are needed.

## License and attribution

GreenChess source is licensed under [GPL-3.0-or-later](LICENSE). Stockfish.js is GPLv3; its pinned source and build instructions are available in [nmrugg/stockfish.js at v19.0.0](https://github.com/nmrugg/stockfish.js/tree/v19.0.0). Engine files are distributed unmodified. See [THIRD_PARTY.md](THIRD_PARTY.md) for asset and dependency credits.

Independent project, not affiliated with Chess.com or Lichess.
