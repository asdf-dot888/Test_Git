import type { ReactNode } from "react";

/**
 * The card text. A leading taunt keyword ("도발") is shown as a small shield tag; the text content stays exactly the
 * catalog description so screen readers and tests read the same sentence.
 */
export function CardDescription({ text }: { text: string }): ReactNode {
  if (!text.startsWith("도발")) return text;
  return <><span className="taunt-tag">도발</span>{text.slice("도발".length)}</>;
}
