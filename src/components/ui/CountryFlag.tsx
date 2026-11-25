import "flag-icons/css/flag-icons.min.css";

/**
 * Country flag rendered as SVG (flag-icons) from an ISO 3166-1 alpha-2 code.
 * Emoji flags are not drawn on Windows (they fall back to two letters like "RU"),
 * so we never rely on regional-indicator emoji.
 * Renders nothing for non-ISO values (e.g. "Internet", empty).
 */
export function CountryFlag({ code, className }: { code?: string | null; className?: string }) {
  const c = code?.trim().toLowerCase();
  if (!c || !/^[a-z]{2}$/.test(c)) return null;
  return (
    <span
      className={`fi fi-${c}${className ? ` ${className}` : ""}`}
      style={{ marginRight: 6, verticalAlign: "middle" }}
      role="img"
      aria-label={c.toUpperCase()}
      title={c.toUpperCase()}
    />
  );
}

export default CountryFlag;
