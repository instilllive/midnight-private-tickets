import { Chain, newSecret, preCommit, hex, type PrivateState } from '../src/tickets.js';

const host = newSecret();
const chain = await Chain.deploy(host, 5n, 5000n, 1n);
const mk = (): PrivateState => ({ secret: newSecret(), hops: 0n });
const try_ = async (label: string, f: () => Promise<unknown>) => {
  try { await f(); console.log(`  ✓ ${label}`); } catch (e: any) { console.log(`  ✗ ${label} → rejected: ${String(e.message).replace(/^.*failed assert: /, '')}`); }
};
const [alice, carol, mallory] = [mk(), mk(), mk()];
console.log('Host issues tickets (host only ever sees a hash of each guest secret)');
await try_('issue alice', () => chain.issueTicket(host, preCommit(alice.secret)));
await try_('issue carol', () => chain.issueTicket(host, preCommit(carol.secret)));
await try_('stranger tries to issue', () => chain.issueTicket(newSecret(), preCommit(mallory.secret)));
console.log('\nAt the door');
await try_('alice proves a valid unused ticket → IN', () => chain.checkIn(alice));
await try_('alice scans AGAIN', () => chain.checkIn(alice));
await try_('mallory has no ticket', () => chain.checkIn(mallory));
console.log('\nCapped private resale (cap $50, 1 hand-off)');
const dave: PrivateState = { secret: newSecret(), hops: 1n };
await try_('carol resells at $60 (over cap)', () => chain.resellTicket(carol, preCommit(dave.secret), 6000n));
await try_('carol resells to dave at $45', () => chain.resellTicket(carol, preCommit(dave.secret), 4500n));
await try_('carol tries to use her old ticket', () => chain.checkIn(carol));
await try_('dave checks in', () => chain.checkIn(dave));
const l = chain.ledger;
console.log(`\nPublic ledger: issued=${l.issued} checkedIn=${l.checkedIn} resold=${l.resold} leaves=${l.tickets.firstFree()}`);
console.log('Nullifiers (all the world learns about who got in):');
for (const n of l.nullifiers) console.log('  ' + hex(n));
