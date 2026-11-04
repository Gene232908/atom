import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../../lib/clipboard';

/** Shows each line of text (e.g. GCash number, account name) with its own Copy button. */
export function CopyLines({ text }: { text: string }) {
  const [copied, setCopied] = useState<number | null>(null);
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const copy = async (line: string, i: number) => {
    if (await copyText(line)) {
      setCopied(i);
      window.setTimeout(() => setCopied((c) => (c === i ? null : c)), 2000);
    }
  };

  return (
    <div className="divide-y divide-hairline">
      {lines.map((line, i) => (
        <div key={`${i}-${line}`} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
          <p className="min-w-0 flex-1 text-[13px] font-medium wrap-break-word text-ink">{line}</p>
          <button
            type="button"
            onClick={() => copy(line, i)}
            aria-label={`Copy ${line}`}
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-fill px-2 text-[11px] font-medium text-accent transition active:scale-95"
          >
            {copied === i ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied === i ? 'Copied' : 'Copy'}
          </button>
        </div>
      ))}
    </div>
  );
}
