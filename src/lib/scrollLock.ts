let locks = 0;

/** Stops the page behind a sheet or full screen from scrolling. Returns the function that unlocks it. */
export function lockScroll(): () => void {
  locks += 1;
  document.body.style.overflow = 'hidden';
  return () => {
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.body.style.overflow = '';
  };
}
