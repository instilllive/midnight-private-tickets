import { describe, it, expect } from 'vitest';
import { Chain, newSecret, preCommit, hex, type PrivateState } from '../src/tickets.js';

const setup = async (max = 5n, cap = 10000n, resales = 1n) => {
  const hostSecret = newSecret();
  const chain = await Chain.deploy(hostSecret, max, cap, resales);
  return { chain, hostSecret };
};
const guest = (): PrivateState => ({ secret: newSecret(), hops: 0n });
const issueTo = async (chain: Chain, hostSecret: Uint8Array, g: PrivateState) =>
  chain.issueTicket(hostSecret, preCommit(g.secret));

describe('Private Tickets (Compact, Midnight)', () => {
  it('host issues tickets; ledger holds only commitments', async () => {
    const { chain, hostSecret } = await setup();
    const alice = guest();
    await issueTo(chain, hostSecret, alice);
    expect(chain.ledger.issued).toBe(1n);
    expect(chain.ledger.nullifiers.size()).toBe(0n);
    expect(chain.ledger.tickets.firstFree()).toBe(1n);
  });

  it('only the host can issue', async () => {
    const { chain } = await setup();
    await expect(chain.issueTicket(newSecret(), preCommit(newSecret()))).rejects.toThrow('only the host can issue tickets');
  });

  it('enforces the ticket supply', async () => {
    const { chain, hostSecret } = await setup(2n);
    await issueTo(chain, hostSecret, guest());
    await issueTo(chain, hostSecret, guest());
    await expect(issueTo(chain, hostSecret, guest())).rejects.toThrow('sold out');
  });

  it('a guest with a valid ticket checks in, and the ledger learns only a nullifier', async () => {
    const { chain, hostSecret } = await setup();
    const [a, b, c] = [guest(), guest(), guest()];
    for (const g of [a, b, c]) await issueTo(chain, hostSecret, g);
    await chain.checkIn(b);
    expect(chain.ledger.checkedIn).toBe(1n);
    expect(chain.ledger.nullifiers.size()).toBe(1n);
    // Nothing public equals any ticket leaf, pre-commitment, or secret: the check-in cannot be linked to a ticket.
    const [nf] = [...chain.ledger.nullifiers];
    for (const g of [a, b, c]) {
      expect(hex(nf)).not.toBe(hex(preCommit(g.secret)));
      expect(hex(nf)).not.toBe(hex(g.secret));
    }
  });

  it('rejects a second scan of the same ticket (nullifier)', async () => {
    const { chain, hostSecret } = await setup();
    const a = guest();
    await issueTo(chain, hostSecret, a);
    await chain.checkIn(a);
    await expect(chain.checkIn(a)).rejects.toThrow('ticket already used');
    expect(chain.ledger.checkedIn).toBe(1n);
  });

  it('rejects someone who never got a ticket', async () => {
    const { chain, hostSecret } = await setup();
    await issueTo(chain, hostSecret, guest());
    await expect(chain.checkIn(guest())).rejects.toThrow();
    expect(chain.ledger.checkedIn).toBe(0n);
  });

  it('rejects a ticket with a forged resale count', async () => {
    const { chain, hostSecret } = await setup();
    const a = guest();
    await issueTo(chain, hostSecret, a);
    await expect(chain.checkIn({ ...a, hops: 3n })).rejects.toThrow();
  });

  it('every guest can check in once; the door count matches', async () => {
    const { chain, hostSecret } = await setup(4n);
    const gs = [guest(), guest(), guest(), guest()];
    for (const g of gs) await issueTo(chain, hostSecret, g);
    for (const g of gs) await chain.checkIn(g);
    expect(chain.ledger.checkedIn).toBe(4n);
    expect(chain.ledger.nullifiers.size()).toBe(4n);
  });

  it('capped private resale: old ticket dies, buyer can check in, seller cannot', async () => {
    const { chain, hostSecret } = await setup(5n, 5000n, 1n);
    const seller = guest();
    await issueTo(chain, hostSecret, seller);
    const buyer: PrivateState = { secret: newSecret(), hops: 1n }; // buyer learns hops from seller
    await chain.resellTicket(seller, preCommit(buyer.secret), 4500n);
    expect(chain.ledger.resold).toBe(1n);
    await expect(chain.checkIn(seller)).rejects.toThrow('ticket already used');
    await chain.checkIn(buyer);
    expect(chain.ledger.checkedIn).toBe(1n);
  });

  it('resale above the cap is rejected', async () => {
    const { chain, hostSecret } = await setup(5n, 5000n, 1n);
    const seller = guest();
    await issueTo(chain, hostSecret, seller);
    await expect(chain.resellTicket(seller, preCommit(newSecret()), 5001n)).rejects.toThrow('price is above the resale cap');
  });

  it('a resold ticket cannot be resold past the resale limit (anti-scalping)', async () => {
    const { chain, hostSecret } = await setup(5n, 5000n, 1n);
    const seller = guest();
    await issueTo(chain, hostSecret, seller);
    const buyer: PrivateState = { secret: newSecret(), hops: 1n };
    await chain.resellTicket(seller, preCommit(buyer.secret), 100n);
    await expect(chain.resellTicket(buyer, preCommit(newSecret()), 100n)).rejects.toThrow('resale limit');
  });

  it('a spent ticket cannot be resold after check-in', async () => {
    const { chain, hostSecret } = await setup();
    const a = guest();
    await issueTo(chain, hostSecret, a);
    await chain.checkIn(a);
    await expect(chain.resellTicket(a, preCommit(newSecret()), 1n)).rejects.toThrow('ticket already used');
  });
});
