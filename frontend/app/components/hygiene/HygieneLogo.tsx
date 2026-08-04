import { HYGIENE } from "./brand";

/**
 * Text lockup of the Dyzah Hygiene logo: navy "DYZAH" over green "HYGIENE"
 * flanked by rules, matching the company mark.
 *
 * `onDark` flips the wordmark to white so it stays legible on the navy header;
 * the green stays constant in both, as it does in the printed logo.
 */
export default function HygieneLogo({
  onDark = false,
  showTagline = false,
  className = "",
}: {
  onDark?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const { wordmark, tagline } = HYGIENE;
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span
        className={`text-[1.35em] font-black tracking-[0.14em] ${
          onDark ? "text-white" : "text-hygiene-navy"
        }`}
      >
        {wordmark.primary}
      </span>
      <span className="mt-[0.2em] flex w-full items-center gap-[0.4em]">
        <span className="h-[2px] flex-1 bg-hygiene-green" />
        <span className="text-[0.78em] font-extrabold tracking-[0.2em] text-hygiene-green">
          {wordmark.secondary}
        </span>
        <span className="h-[2px] flex-1 bg-hygiene-green" />
      </span>
      {showTagline && (
        <span
          className={`mt-[0.5em] text-[0.42em] font-semibold tracking-[0.06em] ${
            onDark ? "text-white/70" : "text-muted"
          }`}
        >
          {tagline}
        </span>
      )}
    </span>
  );
}
