import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Play, Volume2, VolumeX, X } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { lockScroll } from '../../lib/scrollLock';

const VIDEO_SRC = '/tutorial.mp4';
const OPEN_EVENT = 'utang:tutorial';
const localKey = (uid: string) => `utang_tutorial_done_${uid}`;

/** Watch the tutorial again (from the profile menu). Replays can be closed any time. */
export function openTutorial(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Phase = 'checking' | 'playing' | 'ended' | 'fading' | 'revealing' | 'done';

/**
 * The how-to video every user must watch once, right after signing in.
 * The first time there is no close, pause or skip: Proceed appears only at the end.
 */
export function TutorialGate({ uid }: { uid: string }) {
  const [phase, setPhase] = useState<Phase>(() => {
    try {
      return localStorage.getItem(localKey(uid)) === '1' ? 'done' : 'checking';
    } catch {
      return 'checking';
    }
  });
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [replay, setReplay] = useState(false);
  const [remind, setRemind] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const closing = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const open = () => {
      if (phaseRef.current !== 'done') return;
      setReplay(true);
      setProgress(0);
      setNeedsTap(false);
      setPhase('playing');
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (phase !== 'checking') return;
    let cancelled = false;
    // Slow or no internet: do not leave people on a dark screen, just play the video.
    const timer = window.setTimeout(() => !cancelled && setPhase((p) => (p === 'checking' ? 'playing' : p)), 5000);
    getDoc(doc(db, 'users', uid))
      .then((snap) => {
        if (cancelled) return;
        if (snap.data()?.tutorialWatchedAt) {
          try {
            localStorage.setItem(localKey(uid), '1');
          } catch {
            // ignore
          }
          // Already watched on another phone: lift the cover gently.
          setPhase((p) => (p === 'checking' ? 'revealing' : p));
          window.setTimeout(() => !cancelled && setPhase('done'), 1300);
        } else {
          setPhase((p) => (p === 'checking' ? 'playing' : p));
        }
      })
      .catch(() => !cancelled && setPhase((p) => (p === 'checking' ? 'playing' : p)));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Only runs once per sign-in; phase changes after this are driven by the video.
  }, [uid]);

  const showing = phase !== 'done';

  useEffect(() => {
    if (!showing) return;
    // Lets other parts of the app (like reminder notifications) wait until the video is done.
    document.body.dataset.tutorial = 'on';
    const unlock = lockScroll();
    return () => {
      delete document.body.dataset.tutorial;
      unlock();
    };
  }, [showing]);

  // Start with sound if the browser allows it, otherwise muted, otherwise wait for a tap.
  useEffect(() => {
    if (phase !== 'playing') return;
    const v = video.current;
    if (!v) return;
    v.muted = false;
    let tries = 0;
    const start = () =>
      v.play().catch((err: unknown) => {
        // Only a real "sound not allowed" means muted. Other errors (a hiccup while loading) just retry with sound.
        if ((err as { name?: string })?.name === 'NotAllowedError') {
          v.muted = true;
          v.play().catch(() => setNeedsTap(true));
        } else if (tries++ < 3) {
          window.setTimeout(start, 400);
        } else {
          setNeedsTap(true);
        }
      });
    start();
  }, [phase]);

  // Websites cannot read the phone's volume, so remind everyone for the first few seconds.
  useEffect(() => {
    if (phase !== 'playing') return;
    setRemind(true);
    const id = window.setTimeout(() => setRemind(false), 5000);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Keep it playing: switching apps or tabs pauses video, so resume when the page is back.
  useEffect(() => {
    if (phase !== 'playing') return;
    const onVisible = () => {
      const v = video.current;
      if (document.visibilityState === 'visible' && v && v.paused && !v.ended) v.play().catch(() => setNeedsTap(true));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase]);

  if (!showing) return null;

  const proceed = () => {
    if (!replay) {
      try {
        localStorage.setItem(localKey(uid), '1');
      } catch {
        // ignore
      }
      setDoc(doc(db, 'users', uid), { tutorialWatchedAt: Date.now() }, { merge: true }).catch(() => undefined);
    }
    closing.current = true;
    video.current?.pause();
    setPhase('fading');
    window.setTimeout(() => setPhase('revealing'), 550);
    window.setTimeout(() => {
      setPhase('done');
      setReplay(false);
      closing.current = false;
    }, 1900);
  };

  const unmute = () => {
    const v = video.current;
    if (!v) return;
    if (needsTap) {
      v.play()
        .then(() => setNeedsTap(false))
        .catch(() => undefined);
      return;
    }
    if (v.muted) {
      v.muted = false;
      setMuted(false);
    }
  };

  // Exit: the video fades, the app shows through a heavy blur, then the blur slowly clears.
  const leaving = phase === 'fading' || phase === 'revealing';
  const shell: CSSProperties = {
    backgroundColor: phase === 'revealing' ? 'rgba(4,6,15,0)' : phase === 'fading' ? 'rgba(4,6,15,0.45)' : '#04060f',
    backdropFilter: phase === 'revealing' ? 'blur(0px)' : 'blur(26px)',
    WebkitBackdropFilter: phase === 'revealing' ? 'blur(0px)' : 'blur(26px)',
    transition:
      'background-color 1.3s cubic-bezier(0.32,0.72,0,1), backdrop-filter 1.3s cubic-bezier(0.32,0.72,0,1), -webkit-backdrop-filter 1.3s cubic-bezier(0.32,0.72,0,1)',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to use Utang List"
      className={`fixed inset-0 z-[200] select-none ${leaving ? 'pointer-events-none' : ''}`}
      style={shell}
      onClick={phase === 'playing' ? unmute : undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'scale(1.04)' : 'scale(1)',
          transition: 'opacity 0.55s ease, transform 0.8s cubic-bezier(0.32,0.72,0,1)',
          background: 'radial-gradient(120% 80% at 50% 0%, #121a4a 0%, #070b1f 60%, #04060f 100%)',
        }}
      >
        {phase !== 'checking' && (
          <video
            ref={video}
            src={VIDEO_SRC}
            className="pointer-events-none h-full max-h-full w-auto max-w-full object-contain sm:[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onPause={(e) => {
              const v = e.currentTarget;
              if (!v.ended && !closing.current && phase === 'playing' && document.visibilityState === 'visible')
                v.play().catch(() => setNeedsTap(true));
            }}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onEnded={() => {
              setProgress(1);
              setPhase('ended');
            }}
            onError={() => setPhase('ended')}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
          <div className="h-full bg-sky-300/90" style={{ width: `${progress * 100}%` }} />
        </div>

        {phase === 'playing' && muted && !needsTap ? (
          <div className="pointer-events-none absolute bottom-[max(3.25rem,calc(env(safe-area-inset-bottom)+2.5rem))] left-1/2 flex -translate-x-1/2 animate-fade-in items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-ink shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
            <span className="grid size-6 place-items-center rounded-full bg-bad/10 text-bad">
              <VolumeX className="size-3.5" strokeWidth={2.4} />
            </span>
            Sound is off · Tap to turn on
          </div>
        ) : (
          phase === 'playing' &&
          remind &&
          !needsTap && (
            <div className="liquid-rim pointer-events-none absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 flex -translate-x-1/2 animate-fade-in items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-white backdrop-blur-xl [--rim:0.6]">
              <Volume2 className="size-4" />
              Please turn on your volume
            </div>
          )
        )}

        {phase === 'playing' && needsTap && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unmute();
            }}
            className="liquid-rim absolute grid size-20 place-items-center rounded-full bg-white/15 text-white backdrop-blur-xl transition active:scale-95 [--rim:0.7]"
            aria-label="Play video"
          >
            <Play className="ml-1 size-8" fill="currentColor" />
          </button>
        )}

        {replay && phase === 'playing' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              proceed();
            }}
            aria-label="Close tutorial"
            className="liquid-rim absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-xl transition active:scale-90 [--rim:0.6]"
          >
            <X className="size-5" strokeWidth={2.4} />
          </button>
        )}

        {phase === 'ended' && (
          <button
            type="button"
            onClick={proceed}
            className="liquid-rim absolute right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex animate-rise items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-ink shadow-[0_12px_40px_-8px_rgba(47,91,255,0.6)] transition active:scale-95"
          >
            Proceed
            <ArrowRight className="size-4" strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
