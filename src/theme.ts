export const themeAssets = {
  pieces: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150",
  board: "https://images.chesscomfiles.com/chess-themes/boards/icy_sea/200.png",
  coach: "https://assets-coaches.chess.com/image/coachdanny.png",
  chessComPlayIcon: "https://assets-ds.chess.com/color-icons/play-white.svg",
  analysisIcon: "https://assets-ds.chess.com/color-icons/magnifier-star.svg",
};

export const moveIcons = {
  brilliant: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/php4ena5mpf1bjlf8hccpv.png",
  great: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpobj5vs9pecrl4BZmIPd.png",
  best: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpvjtpi9m3qbbgfvXvhZR.png",
  excellent: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpr0g4j3fddqdabQwH119.png",
  good: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phprpbn5fvlm4nv94nJhKZ.png",
  book: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpkr7oe5aum6gqbz2W8KY.png",
  inaccuracy: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpuaotu0b8ovcr9payx0o.png",
  mistake: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpi81juimlh0mtfh6D5vQ.png",
  miss: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phppbq8cu64p8r59HoroLw.png",
  blunder: "https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/Wind/phpj69kvm6s0nu2ftFs7LH.png",
} as const;

export const boardThemes = ["ice", "wood", "classic", "forest", "slate", "rose"] as const;
export type BoardTheme = (typeof boardThemes)[number];
export const pieceThemes = ["neo", "classic", "neo_wood", "alpha", "merida"] as const;
export type PieceTheme = (typeof pieceThemes)[number];

export function pieceImage(color: string, piece: string, theme: PieceTheme = "neo") {
  const folders: Record<PieceTheme, string> = {
    neo: "neo",
    classic: "classic",
    neo_wood: "neo_wood",
    alpha: "alpha",
    merida: "merida",
  };
  return `https://images.chesscomfiles.com/chess-themes/pieces/${folders[theme]}/150/${color}${piece}.png`;
}
