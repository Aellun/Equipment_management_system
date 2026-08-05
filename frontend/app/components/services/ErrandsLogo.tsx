/**
 * Text lockup of the Dyzah Errands logo: "DYZAH" over "ERRANDS" flanked by
 * rules — the same construction as the Dyzah Hygiene mark, in the Errands
 * orange theme so the two businesses read as one family.
 *
 * `onDark` flips the wordmark to white so it stays legible on the dark chrome
 * strip; the brand accent stays constant, as it does across the family.
 */
export default function ErrandsLogo({
  onDark = false,
  showTagline = false,
  className = "",
}: {
  onDark?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span
        className={`text-[1.35em] font-black tracking-[0.14em] ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        DYZAH
      </span>
      <span className="mt-[0.2em] flex w-full items-center gap-[0.4em]">
        <span className="h-[2px] flex-1 bg-brand-500" />
        <span className="text-[0.78em] font-extrabold tracking-[0.2em] text-brand-500">
          ERRANDS
        </span>
        <span className="h-[2px] flex-1 bg-brand-500" />
      </span>
      {showTagline && (
        <span
          className={`mt-[0.5em] text-[0.42em] font-semibold tracking-[0.06em] ${
            onDark ? "text-white/70" : "text-muted"
          }`}
        >
          Handled by verified runners
        </span>
      )}
    </span>
  );
}
