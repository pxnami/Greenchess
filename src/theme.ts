export const themeAssets = {
  pieces: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150",
  board: "https://images.chesscomfiles.com/chess-themes/boards/icy_sea/200.png",
  coach: "https://assets-coaches.chess.com/image/coachdanny.png",
  chessComPlayIcon: "https://assets-ds.chess.com/color-icons/play-white.svg",
};

export const boardThemes = ["ice", "wood", "classic", "forest", "slate", "rose"] as const;
export type BoardTheme = (typeof boardThemes)[number];

export function pieceImage(color: string, piece: string) {
  return `${themeAssets.pieces}/${color}${piece}.png`;
}
