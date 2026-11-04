import { Avatar } from './Avatar';

interface Person {
  name: string;
  photo?: string;
}

/** Small overlapping faces, like a shared card in Apple Wallet. */
export function AvatarStack({ people, max = 4 }: { people: Person[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} photo={p.photo} size="xs" ring="card" />
      ))}
      {extra > 0 && (
        <span className="grid size-6 place-items-center rounded-full bg-white/25 text-[10px] font-semibold text-white ring-2 ring-white/35 backdrop-blur">
          +{extra}
        </span>
      )}
    </div>
  );
}
