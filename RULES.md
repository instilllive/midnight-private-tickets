# Midnight Hackathon (MLH, Nov 13–15 2026) — rules and toolchain notes

Compiled Sat Nov 14 2026 ~10:30 AM ET. Sources: MLH event page, Devpost pages of the two previous MLH×Midnight
editions (the Nov 2026 Devpost page is NOT public/discoverable yet), docs.midnight.network.

## Event (MLH page https://events.mlh.com/events/15201-midnight-hackathon)
- Online, "Partnered Hackathon", Fri Nov 13 12:00 PM ET → Sun Nov 15. Theme: apps that put users back in control of
  personal data (privacy by design). Broad prompt, no named tracks yet. "Prize details coming soon."
- Schedule (ET): Hacking begins Fri 12:00 PM · **Initial submission due Sun Nov 15 10:00 AM** ·
  **Hacking ends / final submission Sun Nov 15 11:45 AM** · Closing ceremony Sun 12:00 PM (twitch.tv/mlh).
- Open to minors 13–18, students, working professionals.
- Registration needs MLH check-in AND Devpost registration; **the email must match on both**.

## Devpost page for THIS event
- Not found. The MLH page has no Devpost link, Devpost search/API lists no Nov 2026 Midnight event, and guessed slugs 404.
  Likely appears for registered participants. Mark must log in to Devpost and open the hackathon from his dashboard.
- The only Midnight Devpost pages found are past editions: midnight-hackathon.devpost.com (Sep 2025),
  midnight-hackathon-2026.devpost.com (May 2026), midnight-hackathon-july-2026.devpost.com (Jul 2026).
  The three share one rule template, which the Nov edition almost certainly reuses (VERIFY on the real page):

### Requirements (from the July 2026 edition, same text as May 2026)
- Demo video **≤ 2 minutes**, showing what you built and how it meets the goals (video REQUIRED).
- Video must **state the hackathon name at the beginning** ("Hey I'm …, this is my demo for Midnight Hackathon").
- Video must be **created during the hackathon weekend**.
- Code in a **public repository**; repo and video must stay public after the event to remain prize-eligible.
- Complete all registration steps on Devpost; MLH check-in; same email on both.
- Do not submit the project to other hackathons. Only ONE project per hackathon.
- **No prior work** ("may not submit projects that include prior work").
- Teams max 5. "We strongly encourage working in teams, and **only team projects will be eligible for prizes**"
  (May/July wording). A solo entry may be judged but possibly not prize-eligible. Check the Nov rules.
- Beginner prize track needs >50% first-time hackers (n/a).

### Prizes in past editions (non-cash): Overall winners (swag / Build Club accelerator invite or Stream Deck + internship interview),
AI, DeFi, Gaming tracks, Best Beginner Hack. Nov 2026 prizes: not yet announced.

### Judging criteria (past editions, judges = Midnight Foundation)
1. Technology — technical difficulty, clever technique, components used
2. Originality — fresh take on privacy / identity / security
3. Execution — polish of core functionality or UI
4. Completion — demonstrably complete in its focused scope
5. Documentation — easy to understand goal and run; concise, developer-friendly README
6. Business value — could it launch as a product

### Devpost submission fields (standard Devpost; confirm on the live form)
Project name · tagline (≤60 chars) · story (inspiration / what it does / how we built it / challenges / accomplishments /
what we learned / what's next) · built-with tags · try-it-out links (repo, demo) · image gallery · video link
(YouTube/Vimeo/Youku) · team members · (event-specific questions possible, e.g. track).

## Midnight network and toolchain (docs.midnight.network, current as of ledger 9 upgrade, Nov 2026)
- Networks: `undeployed` (local devnet in Docker: node + indexer + proof server, pre-funded genesis wallet),
  **`preview`** (public test network, free tNIGHT faucet, no token needed for RPC), `preprod` (public test, needs a
  Blockfrost project token), `mainnet` (real value; NOT used). `testnet-02` is retired.
- Preview: RPC https://rpc.preview.midnight.network · indexer https://indexer.preview.midnight.network/api/v4/graphql ·
  faucet https://faucet.preview.midnight.network/ or https://midnight-tmnight-preview.nethermind.dev/ (rate limited).
- Toolchain: **Compact compiler 0.36.0** (language 0.28.0), **compact-runtime 0.21.0**, **Midnight.js 5.0.0**,
  **proof server 9.0.0** (`docker run -p 6300:6300 midnightntwrk/proof-server:9.0.0`), ledger 9. Install:
  `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh && compact update 0.36.0`.
- Fees: tNIGHT from the faucet must be registered for DUST generation (wallet SDK or Lace).
- Docs I relied on: private-party tutorial (RSVP/check-in), "Using Compact contracts from JavaScript", Compact reference
  (HistoricMerkleTree, merkleTreePathRoot), networks-and-environments.
