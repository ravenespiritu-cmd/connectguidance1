"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

type LocalDateTimeTextProps = {
  iso: string;
  pattern: string;
  className?: string;
};

/**
 * Formats a stored UTC instant in the viewer's local timezone.
 * Server-rendered `format(new Date(iso))` often uses UTC on Vercel, which mismatches wall time.
 */
export function LocalDateTimeText({ iso, pattern, className }: LocalDateTimeTextProps) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(format(new Date(iso), pattern));
  }, [iso, pattern]);

  if (text == null) {
    return <span className={className} aria-busy="true" />;
  }

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
