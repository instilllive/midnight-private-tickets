# 🎟️ Private Tickets on Midnight

**Prove you hold a valid, unused ticket at the door, without revealing who you are or which ticket is yours.**
A Compact smart contract for the [Midnight](https://midnight.network) network (built for the MLH Midnight Hackathon, Nov 2026).

Normal ticketing leaks a lot: the venue, the ticketing platform and anyone reading the chain can link your wallet, your ticket
ID and every event you attend. Here the chain only ever stores hashes and one-time nullifiers.

**Deck:** [`deck/index.html`](deck/index.html) · [PDF](deck/private-tickets-midnight-deck.pdf) · **Demo video:** [`demo/midnight-private-tickets.mp4`](demo/midnight-private-tickets.mp4) (≈100 s, phone · tablet · desktop)

## What it does
| Step | Who | What is public | What stays private |
|---|---|---|---|
| `issueTicket(pre)` | Host | one Merkle leaf (a hash) | the guest's secret (host only receives `H(secret)`) |
| `checkIn()` | Guest | a Merkle root + a one-time **nullifier** | which leaf is theirs, their secret, who they are |
| `resellTicket(buyerPre, price)` *(optional)* | Seller | a new leaf, a nullifier, `price ≤ cap` passed | who sold, who bought, which ticket |

- **Membership in zero knowledge.** `checkIn` proves "I know a secret whose leaf is in the ticket Merkle tree" with a
  `HistoricMerkleTree<10, Bytes<32>>` path (up to 1,024 tickets).
- **No double entry.** The nullifier `H("pt:null:", secret)` is stored in a ledger `Set`. A second scan hits the same
  nullifier and the circuit's `assert` fails. The nullifier cannot be linked back to the leaf without the secret.
- **Capped private resale.** A seller spends their ticket (publishing its nullifier) and mints a fresh leaf for the buyer,
  with a public price cap and a per-ticket resale limit (the resale count is part of the private leaf).

Contract: [`contract/private-tickets.compact`](contract/private-tickets.compact) (about 100 lines).

## Why it's private (and what leaks)
Everything secret enters as a Compact `witness` (`localSecret`, `ticketHops`, `ticketPath`) and never reaches the ledger.
The compiler forces an explicit `disclose()` on anything derived from them; the only disclosed values are the leaf hash,
the nullifier, the Merkle root used, and the rules (supply, price cap). Honest limits:
- The call name is public, so observers can tell check-ins from resales, and see when each happens.
- The Merkle root used in a proof reveals which snapshot of the tree you proved against (the anonymity set is the tickets
  issued by then). Issue tickets in batches for a bigger set.
- The host knows how many tickets it issued, and (obviously) the leaf it created for each pre-commitment. It cannot link a
  check-in to a leaf.

## Run it
Requirements: Node 22+, the Compact toolchain **0.36.0** (language 0.28, runtime 0.21, Midnight ledger 9).
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.36.0
npm install
npm run compile      # compiles the contract and generates proving/verifying keys (~10s)
npm test             # 12 tests: success paths + every rejection path
npm run demo         # narrated scenario in the terminal
npm run ui           # web UI on http://localhost:8799 (host issues, guest scans, second scan rejected, resale)
```
### Real zero-knowledge proofs
`npm test`, `demo` and `ui` run the compiled contract logic locally (the same code the circuits enforce). To also generate real
ZK proofs with Midnight's proof server (9.0.0):
```bash
docker run -p 6300:6300 midnightntwrk/proof-server:9.0.0     # or build tag proof-server-9.0.0 of midnightntwrk/midnight-ledger
npm run prove
```
`npm run prove` runs issue → resell → check-in, sends each call's proof preimage + this contract's proving keys to the proof
server's `/check` and `/prove`, and prints the proof sizes. (Verified here with the proof server built from source.)

## Test output
```
 ✓ host issues tickets; ledger holds only commitments
 ✓ only the host can issue
 ✓ enforces the ticket supply
 ✓ a guest with a valid ticket checks in, and the ledger learns only a nullifier
 ✓ rejects a second scan of the same ticket (nullifier)
 ✓ rejects someone who never got a ticket
 ✓ rejects a ticket with a forged resale count
 ✓ every guest can check in once; the door count matches
 ✓ capped private resale: old ticket dies, buyer can check in, seller cannot
 ✓ resale above the cap is rejected
 ✓ a resold ticket cannot be resold past the resale limit (anti-scalping)
 ✓ a spent ticket cannot be resold after check-in
 Tests 12 passed (12)
```
```
npm run prove
  ✓ issueTicket: constraint check passed, ZK proof generated (5420 bytes)
  ✓ resellTicket: constraint check passed, ZK proof generated (5420 bytes)
  ✓ checkIn: constraint check passed, ZK proof generated (5420 bytes)
```

## Limits (read before you use this)
- **Not yet deployed to a public Midnight network.** Deploying to Preview needs a funded wallet (tNIGHT from the faucet
  registered for DUST) and a proof server; the contract compiles with the Preview/Mainnet toolchain (0.36.0). The off-chain
  harness (`src/tickets.ts`) simulates the chain, so the demo UI shows contract behavior, not an on-chain transaction.
  No mainnet use of any kind.
- **Resale price is a rule check, not a payment.** The contract enforces `price ≤ cap` on the declared price; moving the money
  (e.g. shielded tokens, atomic swap) is future work.
- **Host-only issuing.** There is no payment on purchase, and the host can issue to itself.
- **Secrets are bearer secrets.** Lose the 32-byte secret, lose the ticket. Whoever has it can use it.
- Tree depth 10 caps an event at 1,024 tickets; `findPathForLeaf` is O(n) (fine at this size).
- Prototype, not audited.

## Layout
```
contract/private-tickets.compact   the Compact contract
src/tickets.ts                     off-chain harness: chain state + per-user private state
tests/                             vitest suite
scripts/demo.ts, scripts/prove.ts  narrated demo, real proofs via proof server
ui/                                tiny web UI (server.ts + index.html)
RULES.md                           hackathon rules and toolchain notes
```
MIT licensed. Built by Mark Flores (solo) for the MLH Midnight Hackathon, Nov 2026.
