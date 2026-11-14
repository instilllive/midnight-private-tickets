# Devpost draft — Midnight Hackathon (MLH, Nov 13–15 2026)

NOT SUBMITTED. Mark must submit it himself on Devpost (initial deadline Sun Nov 15 10:00 AM ET, final 11:45 AM ET).
Before submitting: confirm the live Devpost rules (video ≤ 2 min starting with the hackathon name, video made this weekend,
public repo, one project, "no prior work", prize eligibility for solo entries). Devpost and MLH emails must match.

## Project name
Private Tickets

## Tagline (≤ 60 chars)
Prove you have a ticket without revealing who you are.

## Short description (elevator pitch)
A Midnight (Compact) contract where a guest proves in zero knowledge that they hold a valid, unused event ticket. The chain
never learns who they are or which ticket is theirs. Check-in is a one-time nullifier, so a ticket can't be scanned twice.

## Story

### Inspiration
Ticketing is a privacy leak. Every scan links your wallet, your ticket ID and the events you go to, and resale marketplaces
build profiles on both buyers and sellers. I already build event-pass software ("Secure Event Pass System" took 2nd place at
Nitro 05), and I kept running into the same question: why does proving "I'm allowed in" require saying "I'm Mark, seat 14B"?
Midnight's selective disclosure is built for exactly that.

### What it does
- The **host** deploys an event contract (supply, resale price cap, resale limit) and issues tickets. The guest keeps a
  secret and gives the host only a hash of it, so the host never learns the secret.
- At the door the **guest** calls `checkIn()`. A zero-knowledge proof shows "my secret hashes into a leaf in the ticket
  Merkle tree and I haven't used it". The ledger learns only a Merkle root and a **nullifier**.
- A second scan of the same ticket produces the same nullifier and is rejected. Someone with no ticket can't build a valid proof.
- **Capped private resale:** a seller spends their ticket and mints a new one for the buyer. The contract enforces a public
  price cap and a per-ticket resale limit (the resale count lives in the private leaf), so nobody scalps at 10x.
- A small web UI shows the three views: the host issuing, the guest scanning (including the rejected double scan), and what
  the public chain actually sees (hashes and nullifiers only, no names).

### How we built it
- **Compact 0.36.0** (language 0.28) contract, `contract/private-tickets.compact`: `HistoricMerkleTree<10, Bytes<32>>` of ticket
  leaves, a `Set<Bytes<32>>` of nullifiers, three circuits (`issueTicket`, `checkIn`, `resellTicket`), and three witnesses
  (`localSecret`, `ticketHops`, `ticketPath`) that keep the secret, resale count and Merkle path on the user's machine.
  Domain-separated `persistentHash` for host key, pre-commitment, leaf and nullifier.
- **compact-runtime 0.21.0** TypeScript harness (`src/tickets.ts`) that plays the chain plus each user's private state.
- **12 vitest tests** covering success paths and every rejection (non-host issue, sold out, double scan, no ticket, forged
  resale count, over-cap resale, resale limit, resale after check-in).
- **Real ZK proofs:** `npm run prove` takes the proof data of each circuit call and gets real proofs from Midnight's proof
  server 9.0.0 (`/check` + `/prove`): all three circuits prove (about 2–4 s each, 5.4 KB proofs).
- Tiny Node + HTML UI. Built solo in one weekend.

### Challenges we ran into
- Getting the privacy boundary right: the compiler rightly insists on `disclose()` for anything derived from a secret, which
  made me decide exactly what leaks (leaf hash, nullifier, the Merkle root used, the rules) and what never does.
- Making resale unlinkable yet bounded: the resale count has to be private but still enforced, so it is bound into the leaf and
  the contract mints the buyer's next leaf with `hops + 1`, so a seller can't reset it.
- The nullifier must be identical for check-in and resale (one ticket, one spend) but unlinkable to the leaf.
- No Docker on my build box, so I built the proof server from source (`midnight-ledger` tag `proof-server-9.0.0`) to get real proofs.

### Accomplishments that we're proud of
- A complete issue → check-in → double-scan-rejected → capped-resale flow in about 100 lines of Compact, with real proofs.
- The privacy claims are tested (nullifier is not equal to the secret, pre-commitment or any leaf; forged state is rejected).

### What we learned
Compact's witness/disclose model makes privacy reviews concrete: you can grep for every `disclose` and know exactly what the
chain can see. Merkle membership plus nullifiers is a small, reusable pattern for any "prove you're on the list" app.

### What's next
- Deploy to Midnight Preview with a wallet (Lace / wallet SDK) and run the UI against real transactions.
- Real payments for resale (shielded token + atomic swap) and paid primary sales.
- Souvenir mode: after check-in, lock resale and issue a keepsake, building on my earlier Private Tickets work on other chains.
- Door scanner app with QR-encoded proofs; batch issuing for larger anonymity sets.

## Built with (tags)
midnight, compact, zero-knowledge, zk-snark, typescript, node.js, vitest, merkle-tree, html, privacy

## Try it out / links
- Repo (public, MIT): https://github.com/instilllive/midnight-private-tickets
- Run: `npm install && npm run compile && npm test && npm run demo && npm run ui` (see README)
- Demo video: TODO (Mark records; ≤ 2 min; first words must name the hackathon, e.g. "Hi, I'm Mark Flores and this is my demo for the Midnight Hackathon")
- Network: not yet deployed on Midnight Preview (needs Mark's wallet + faucet). Say this honestly in the video and form.

## Team
Mark Flores — solo builder, Virginia, USA. "Secure Event Pass System" placed 2nd at Nitro 05.

## Prior-work disclosure (recommended wording)
This is a new codebase, written this weekend, in a new language (Compact) for a new network. It shares the *idea* of an
event-ticket app with my earlier projects (Private Tickets on NEAR and Solana/Metaplex), but no code was copied from them.
Cross-hackathon note: those projects were submitted to other events; this Midnight contract is submitted only here.

## Suggested 2-minute video outline
0:00 "Hi, I'm Mark Flores and this is my demo for the Midnight Hackathon." (problem, 15 s) → 0:15 show contract (15 s) →
0:30 UI: issue ticket, scan in → IN (30 s) → 1:00 scan again → rejected, stranger → rejected (20 s) →
1:20 public ledger panel: only hashes and nullifiers (15 s) → 1:35 `npm run prove` real proofs (15 s) →
1:50 limits + what's next (10 s).
