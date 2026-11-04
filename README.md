# Utang List

A simple web app to keep track of who owes what. The lender lists items with a price and split cost. Everyone in the list sees the same thing live. People tap "I paid", and the lender confirms it.

Built with React, TypeScript, Tailwind CSS and Firebase (Google sign in + Firestore).

## How it works

- **Lender** makes a list, sends the invite link, then adds items (description, where it is from like Shopee, price, who splits it). The split cost is worked out automatically.
- **People who owe** open the link, sign in with Google, and join. On phones they swipe through their debts as cards and tap **Pay now** to see the QR and payment details.
- After paying, they tap **I already paid**. The lender sees **Waiting** and taps **Mark paid** to confirm.

