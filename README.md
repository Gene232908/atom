# Utang List

A simple web app to keep track of who owes what. The lender lists items with a price and split cost. Everyone in the list sees the same thing live. People tap "I paid", and the lender confirms it.

Built with React, TypeScript, Tailwind CSS and Firebase (Google sign in + Firestore).

## One-time Firebase setup

Do these once in the [Firebase console](https://console.firebase.google.com/project/loan-f1b2c):

1. **Turn on Google sign in.** Go to Authentication, then Sign-in method, then enable Google.
2. **Create the database.** Go to Firestore Database, then Create database. Pick a location near you (for example `asia-southeast1`).
3. **Add the security rules.** Open Firestore Database, then Rules. Paste everything from `firestore.rules` and click Publish. Or use the Firebase CLI (see below).
4. **Allow your website.** If you host the app somewhere other than Firebase Hosting, add that domain in Authentication, then Settings, then Authorized domains.

## Run on your computer

```bash
npm install
npm run dev
```

Then open the link it shows (usually http://localhost:5173).

## Put it online (Firebase Hosting, free)

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy
```

This uploads the website and the security rules. Your app will be at https://loan-f1b2c.web.app

## How it works

- **Lender** makes a list, sends the invite link, then adds items (description, where it is from like Shopee, price, who splits it). The split cost is worked out automatically.
- **People who owe** open the link, sign in with Google, and join. On phones they swipe through their debts as cards and tap **Pay now** to see the QR and payment details.
- After paying, they tap **I already paid**. The lender sees **Waiting** and taps **Mark paid** to confirm.

## Staying inside the free Firebase limits

- Data is saved on the device, so reopening the app only downloads what changed.
- Live updates pause when the app is in the background for 90 seconds, and restart when you come back.
- The app uses one live connection for your lists and one for the list you are viewing.
- The payment QR picture is only downloaded when someone taps "Pay now".
- Totals for the home screen are saved on the list itself, so the home screen does not load every item.
