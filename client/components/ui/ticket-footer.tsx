"use client";

export default function TicketFooter({
  footerExtraText,
}: {
  footerExtraText: string;
}) {
  return (
    <footer className="border-t border-zinc-800 px-8 py-3 flex items-center justify-between">
      <small className="text-zinc-600 font-mono text-[14px] not-italic">
        VENUEPASS™
      </small>
      <nav aria-label="Event categories">
        <ul className="flex gap-1 list-none p-0">
          {[
            ["🎵", "Music"],
            ["🎭", "Theatre"],
            ["⚽", "Sports"],
            ["🎪", "Events"],
          ].map(([emoji, label]) => (
            <li key={label}>
              <span
                role="img"
                aria-label={label}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity cursor-default"
              >
                {emoji}
              </span>
            </li>
          ))}
        </ul>
      </nav>
      <small className="text-zinc-600 font-mono text-[12px] not-italic">
        {footerExtraText}
      </small>
    </footer>
  );
}
