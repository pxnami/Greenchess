import { labels, type Category, type Lang } from "./chess";
import { moveIcons } from "./theme";

type Props = {
  category: Category;
  lang: Lang;
  className?: string;
};

export function MoveBadge({ category, lang, className = "" }: Props) {
  const label = labels[category][lang === "de" ? 0 : 1];
  return (
    <span className={`badge ${className}`.trim()} title={label} aria-label={label}>
      <img src={moveIcons[category]} alt="" />
    </span>
  );
}
