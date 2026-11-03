export function errorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  if (err instanceof Error) return err.message;
  return '';
}

/** Turns technical errors into plain, simple English. */
export function friendlyError(err: unknown): string {
  const code = errorCode(err).replace(/^firestore\//, '');

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return 'Sign in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign in window. Please allow pop-ups and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'This website is not allowed to sign in yet. The app owner needs to add it in Firebase settings.';
    case 'auth/operation-not-allowed':
      return 'Google sign in is not turned on yet. The app owner needs to turn it on in Firebase.';
    case 'auth/too-many-requests':
      return 'Too many tries. Please wait a few minutes and try again.';
    case 'auth/web-storage-unsupported':
    case 'auth/operation-not-supported-in-this-environment':
      return 'This browser cannot sign in. Please open the link in Chrome or Safari.';
    case 'permission-denied':
      return 'You are not allowed to do this. You may have been removed from this list.';
    case 'resource-exhausted':
      return 'The app is very busy today and reached its free limit. Please try again later.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Could not connect. Please check your internet and try again.';
    case 'not-found':
      return 'We could not find this. It may have been deleted.';
    case 'not-image':
      return 'Please choose a picture file.';
    case 'too-big':
      return 'This picture is too big. Please use a smaller screenshot of the QR code.';
    case 'bad-image':
      return 'We could not open this picture. Please try another one.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
