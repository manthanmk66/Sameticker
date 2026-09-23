/**
 * Two bars of identical silhouette: one solid, one hollow. Same shape,
 * different substance — which is the whole argument of the site.
 *
 * Inline rather than an image file so it inherits the theme's accent through
 * currentColor and stays sharp at any size. Geometry matches the source mark
 * (31 wide, 103 tall, 10 gap, 6 stroke).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 103"
      className={className}
      fill="none"
      role="img"
      aria-label="SameTicker"
    >
      <rect width="31" height="103" fill="currentColor" />
      <rect
        x="44"
        y="3"
        width="25"
        height="97"
        stroke="currentColor"
        strokeWidth="6"
      />
    </svg>
  );
}
