import { groupGradient } from '../../lib/cardTheme';
import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { inviteLink } from '../../hooks/useRoute';
import { copyText } from '../../lib/clipboard';
import type { Group } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { WalletCard } from '../ui/WalletCard';

const STEPS = [
  'Send the link (Messenger, Viber, SMS, anything).',
  'They open it and sign in with Google.',
  'They tap Join. Then you can add items for them.',
];

export function InviteSheet({ open, onClose, group }: { open: boolean; onClose: () => void; group: Group }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(group.inviteCode);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const code = group.inviteCode;

  const copy = async () => {
    if (await copyText(link)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: group.name,
        text: `Join my list "${group.name}" so you can see what you owe.`,
        url: link,
      });
    } catch {
      // User closed the share menu. Nothing to do.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Invite people" description="Send this to the people who owe you.">
      <WalletCard seed={group.id} background={groupGradient(group)} className="flex h-[188px] flex-col p-5">
        <p className="truncate text-[17px] font-semibold">{group.name}</p>
        <p className="text-[12px] text-white/70">Invite code</p>
        <p className="mt-auto font-mono text-[26px] font-semibold tracking-[0.2em] tabular-nums">
          {code.slice(0, 4)} {code.slice(4)}
        </p>
        <p className="mt-1 truncate text-[11px] text-white/70">{link}</p>
      </WalletCard>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          size="lg"
          variant={canShare ? 'white' : 'primary'}
          full
          className={canShare ? '' : 'col-span-2'}
          icon={copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          onClick={copy}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
        {canShare && (
          <Button size="lg" full icon={<Share2 className="size-5" />} onClick={share}>
            Share
          </Button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-[20px] bg-white">
        <ol className="divide-y divide-hairline">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 text-[14px]">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Sheet>
  );
}
