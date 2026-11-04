import { useEffect, useRef, useState } from 'react';
import { ImagePlus, QrCode, Trash2 } from 'lucide-react';
import { useSafeWrite, useToast } from '../../hooks/useToast';
import { navigate } from '../../hooks/useRoute';
import { deleteGroup, loadQr, saveGroupSettings } from '../../services/groups';
import { compressImage } from '../../lib/image';
import { friendlyError } from '../../lib/errors';
import type { Group } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { TextArea, TextField } from '../ui/Field';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { GroupList, GroupRow, RowIcon } from '../ui/Group';
import { Spinner } from '../ui/Spinner';
import { WalletCard } from '../ui/WalletCard';
import { ColorPicker } from '../ui/ColorPicker';
import { listGradient } from '../../lib/cardTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
}

export function SettingsSheet(props: Props) {
  if (!props.open) return null;
  return <SettingsForm {...props} />;
}

function SettingsForm({ onClose, group }: Props) {
  const write = useSafeWrite();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(group.name);
  const [note, setNote] = useState(group.paymentNote);
  const [color, setColor] = useState(group.color);
  const [nameError, setNameError] = useState('');
  // undefined = not changed, string = new picture, null = removed
  const [newQr, setNewQr] = useState<string | null | undefined>(undefined);
  const [savedQr, setSavedQr] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(group.hasQr);
  const [processing, setProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!group.hasQr) return;
    let alive = true;
    loadQr(group.id)
      .then((img) => alive && setSavedQr(img))
      .catch(() => undefined)
      .finally(() => alive && setQrLoading(false));
    return () => {
      alive = false;
    };
  }, [group.id, group.hasQr]);

  const shownQr = newQr === undefined ? savedQr : newQr;

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setProcessing(true);
    try {
      setNewQr(await compressImage(file));
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = () => {
    const clean = name.trim();
    if (!clean) {
      setNameError('Please give your list a name.');
      return;
    }
    write(
      saveGroupSettings(group, { name: clean.slice(0, 80), paymentNote: note.trim().slice(0, 500), qr: newQr, color }),
      'Saved',
    );
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="List settings"
        footer={
          <Button size="lg" full onClick={save} disabled={processing}>
            Save
          </Button>
        }
      >
        <div className="space-y-5 pt-1">
          <TextField
            id="settings-name"
            label="List name"
            value={name}
            maxLength={80}
            error={nameError}
            onChange={(e) => {
              setName(e.target.value);
              setNameError('');
            }}
          />

          <div className="space-y-3">
            <WalletCard seed={group.id} background={listGradient(group.id, color, name)} className="flex h-24 flex-col p-4">
              <p className="truncate text-[16px] font-semibold">{name.trim() || 'Your list'}</p>
              <p className="mt-auto font-mono text-[13px] tracking-[0.18em] text-white/85">
                •••• {group.inviteCode.slice(-4)}
              </p>
            </WalletCard>
            <ColorPicker
              label="List card color"
              value={color}
              onChange={setColor}
              autoBackground={listGradient(group.id, '', name)}
              hint="Everyone in the list sees this color on their home screen."
            />
          </div>

          <TextArea
            id="settings-note"
            label="Payment details"
            rows={3}
            maxLength={500}
            placeholder={'e.g. GCash 0917 123 4567\nJuan D.'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            hint="Everyone sees this when they tap Pay now."
          />

          <div>
            <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">Payment QR code</p>
            <div className="rounded-[20px] bg-white p-4 text-center">
              {qrLoading || processing ? (
                <div className="grid h-40 place-items-center text-muted">
                  <Spinner className="size-7" />
                </div>
              ) : shownQr ? (
                <img
                  src={shownQr}
                  alt="Payment QR code"
                  className="mx-auto max-h-64 w-auto max-w-full rounded-2xl object-contain"
                />
              ) : (
                <div className="py-5">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-fill">
                    <QrCode className="size-6" />
                  </span>
                  <p className="mt-2 text-[14px] text-muted">Add a screenshot of your GCash, Maya or bank QR.</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button
                  size="sm"
                  icon={<ImagePlus className="size-4" />}
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                >
                  {shownQr ? 'Change picture' : 'Add picture'}
                </Button>
                {shownQr && (
                  <Button size="sm" variant="secondary" className="text-bad" onClick={() => setNewQr(null)}>
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
            {newQr !== undefined && (
              <p className="mt-1.5 px-1 text-[12px] font-semibold text-warn-ink">Tap Save to keep this change.</p>
            )}
          </div>

          <GroupList>
            <GroupRow
              icon={
                <RowIcon color="#ff3b30">
                  <Trash2 className="size-4" />
                </RowIcon>
              }
              label="Delete this list"
              tone="danger"
              chevron={false}
              onClick={() => setConfirmDelete(true)}
            />
          </GroupList>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this whole list?"
        message={
          <>
            <span className="font-semibold text-ink">"{group.name}"</span> and all of its items will be deleted for
            everyone. This cannot be undone.
          </>
        }
        confirmText="Yes, delete"
        danger
        onConfirm={async () => {
          try {
            await deleteGroup(group);
            toast('List deleted');
            navigate('/', true);
          } catch (err) {
            toast(friendlyError(err), 'error');
          }
        }}
      />
    </>
  );
}
