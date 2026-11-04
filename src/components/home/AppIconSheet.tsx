import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Check, Image as ImageIcon, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import {
  PRESET_COLORS,
  PRESET_GLYPHS,
  generateAppIconDataUrl,
  getStoredAppIcon,
  saveAppIconConfig,
  type AppIconConfig,
} from '../../lib/appIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AppIconSheet({ open, onClose }: Props) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].id);
  const [selectedGlyph, setSelectedGlyph] = useState(PRESET_GLYPHS[0].id);
  const [customImageDataUrl, setCustomImageDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('/apple-touch-icon.png');
  const [saving, setSaving] = useState(false);

  // Initialize with stored config
  useEffect(() => {
    if (!open) return;
    const stored = getStoredAppIcon();
    if (stored.type === 'custom' && stored.customImageDataUrl) {
      setMode('custom');
      setCustomImageDataUrl(stored.customImageDataUrl);
      setPreviewUrl(stored.customImageDataUrl);
    } else if (stored.type === 'preset') {
      setMode('preset');
      if (stored.gradientKey) setSelectedColor(stored.gradientKey);
      if (stored.iconKey) setSelectedGlyph(stored.iconKey);
    } else {
      setMode('preset');
      setPreviewUrl('/apple-touch-icon.png');
    }
  }, [open]);

  // Update live preview whenever preset changes
  useEffect(() => {
    if (mode === 'preset') {
      const config: AppIconConfig = {
        type: 'preset',
        gradientKey: selectedColor,
        iconKey: selectedGlyph,
      };
      generateAppIconDataUrl(config, 256).then(setPreviewUrl);
    } else if (mode === 'custom' && customImageDataUrl) {
      const config: AppIconConfig = {
        type: 'custom',
        customImageDataUrl,
      };
      generateAppIconDataUrl(config, 256).then(setPreviewUrl);
    }
  }, [mode, selectedColor, selectedGlyph, customImageDataUrl]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomImageDataUrl(result);
        setMode('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let config: AppIconConfig;
      if (mode === 'custom' && customImageDataUrl) {
        config = { type: 'custom', customImageDataUrl };
      } else {
        config = {
          type: 'preset',
          gradientKey: selectedColor,
          iconKey: selectedGlyph,
        };
      }
      await saveAppIconConfig(config);
      toast('App icon updated! Re-add to Home Screen to apply.');
      onClose();
    } catch {
      toast('Failed to apply icon. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await saveAppIconConfig({ type: 'default' });
      setPreviewUrl('/apple-touch-icon.png');
      setMode('preset');
      setSelectedColor(PRESET_COLORS[0].id);
      setSelectedGlyph(PRESET_GLYPHS[0].id);
      setCustomImageDataUrl(null);
      toast('Reset to default 3D glowing wallet icon!');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Customize App Icon">
      <div className="space-y-5">
        {/* Live Home Screen Icon Mockup */}
        <div className="flex flex-col items-center justify-center rounded-[22px] bg-gradient-to-b from-zinc-100 to-zinc-200/60 p-6 text-center ring-1 ring-black/[0.06]">
          <div className="relative">
            <img
              src={previewUrl}
              alt="App icon preview"
              className="size-24 rounded-[22px] object-cover shadow-[0_12px_30px_-6px_rgba(0,0,0,0.35)] ring-1 ring-black/10 transition-all duration-300"
            />
            <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/20" />
          </div>
          <p className="mt-2.5 text-[13px] font-semibold tracking-tight text-ink">Utang List</p>
          <p className="text-[11px] text-muted">Home Screen Preview</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-fill p-1 ring-1 ring-black/[0.04]">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition ${
              mode === 'preset' ? 'bg-white text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>Icon & Color</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition ${
              mode === 'custom' ? 'bg-white text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            <ImageIcon className="size-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>

        {mode === 'preset' ? (
          <div className="space-y-4">
            {/* Color Theme Selector */}
            <div>
              <p className="px-1 text-[12px] font-bold uppercase tracking-wider text-muted">
                Background Theme
              </p>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {PRESET_COLORS.map((c) => {
                  const active = selectedColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id)}
                      title={c.name}
                      className={`relative grid size-10 place-items-center rounded-xl transition active:scale-95 shadow-xs ${
                        active ? 'ring-2 ring-accent ring-offset-2' : 'hover:opacity-90'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                    >
                      {active && <Check className="size-4 text-white drop-shadow-sm" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glyph Symbol Selector */}
            <div>
              <p className="px-1 text-[12px] font-bold uppercase tracking-wider text-muted">
                Icon Symbol
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {PRESET_GLYPHS.map((g) => {
                  const active = selectedGlyph === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGlyph(g.id)}
                      title={g.name}
                      className={`flex h-12 flex-col items-center justify-center rounded-xl bg-white text-[20px] shadow-xs ring-1 transition active:scale-95 ${
                        active ? 'ring-2 ring-accent bg-accent/5' : 'ring-black/[0.06] hover:bg-fill'
                      }`}
                    >
                      <span>{g.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-hairline-strong bg-white/50 p-6 text-center transition hover:bg-white active:scale-[0.99]"
            >
              <div className="grid size-12 place-items-center rounded-full bg-accent/10 text-accent mb-2">
                <Upload className="size-5" />
              </div>
              <p className="text-[14px] font-semibold text-ink">
                {customImageDataUrl ? 'Choose a different photo' : 'Attach your photo or logo'}
              </p>
              <p className="mt-1 text-[12px] text-muted max-w-xs">
                Select any picture from your phone or gallery. It will automatically fit into a squircle app icon.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-hairline">
          <Button
            size="md"
            variant="primary"
            full
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Applying Icon...' : 'Apply as App Icon'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            full
            disabled={saving}
            onClick={handleReset}
            icon={<RotateCcw className="size-3.5" />}
          >
            Reset to Default App Icon
          </Button>
        </div>

        {/* Step Guide */}
        <div className="rounded-[16px] bg-canvas/70 p-3.5 text-[12px] text-muted space-y-1">
          <p className="font-semibold text-ink">How to add to Home Screen:</p>
          <p>• <strong>iPhone:</strong> Tap Share <span className="text-accent font-bold">⬆️</span> in Safari ➔ <strong>"Add to Home Screen"</strong>.</p>
          <p>• <strong>Android:</strong> Tap Menu <strong>⋮</strong> in Chrome ➔ <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</p>
        </div>
      </div>
    </Sheet>
  );
}
