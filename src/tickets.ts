// Thin off-chain harness around the compiled Compact contract.
// It plays the role of the chain (public ledger state) and of each user's machine
// (private state: secret + resale count). No secret ever enters `Chain` state.
import * as RT from '@midnight-ntwrk/compact-runtime';
import { randomBytes } from 'node:crypto';
import { Contract, ledger, pureCircuits, type Ledger } from '../contract/managed/private-tickets/contract/index.js';

export type PrivateState = { secret: Uint8Array; hops: bigint };

const COIN = '0'.repeat(64);

const witnesses = {
  localSecret: ({ privateState }: RT.WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array] => [
    privateState,
    privateState.secret,
  ],
  ticketHops: ({ privateState }: RT.WitnessContext<Ledger, PrivateState>): [PrivateState, bigint] => [
    privateState,
    privateState.hops,
  ],
  ticketPath: ({ privateState, ledger: l }: RT.WitnessContext<Ledger, PrivateState>, leaf: Uint8Array) => {
    const path = l.tickets.findPathForLeaf(leaf);
    if (!path) throw new Error('no such ticket in the tree');
    return [privateState, path] as [PrivateState, typeof path];
  },
};

export const newSecret = () => new Uint8Array(randomBytes(32));
export const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

/** Pre-commitment a guest hands to the host (or to a resale buyer's seller). Uses the contract's own pure circuit. */
export const preCommit = (secret: Uint8Array): Uint8Array => pureCircuits.preimage(secret);

export class Chain {
  readonly contract = new Contract<PrivateState>(witnesses as any);
  readonly address = RT.sampleContractAddress();
  state!: RT.ContractState | any;
  private ctxState: any;
  /** Proof data (inputs, transcripts) of the most recent circuit call, for the real prover. */
  lastProofData: any;

  static async deploy(hostSecret: Uint8Array, max: bigint, cap: bigint, resales: bigint) {
    const c = new Chain();
    const ps: PrivateState = { secret: hostSecret, hops: 0n };
    const ctor = await c.contract.initialState(RT.createConstructorContext(ps, COIN), max, cap, resales);
    c.ctxState = ctor.currentContractState;
    return c;
  }

  get ledger(): Ledger {
    // Right after deploy the state is a ContractState; after a circuit call it is a ChargedState.
    const s = this.ctxState;
    return ledger(s instanceof (RT as any).ContractState ? s.data : s);
  }

  /** Run one circuit as a given user. State only advances if the circuit's asserts all pass. */
  private async run<T>(circuitId: string, ps: PrivateState, call: (ctx: any) => Promise<any>) {
    const ctx = RT.createCircuitContext({
      circuitId,
      contractAddress: this.address,
      coinPublicKeyOrZswapState: COIN,
      contractState: this.ctxState,
      privateState: ps,
    } as any);
    const res = await call(ctx);
    this.ctxState = res.context.callContext.currentQueryContext.state;
    const trace = res.context.callProofDataTrace;
    this.lastProofData = trace[trace.length - 1];
    return res;
  }

  issueTicket(hostSecret: Uint8Array, pre: Uint8Array) {
    return this.run('issueTicket', { secret: hostSecret, hops: 0n }, (c) => this.contract.impureCircuits.issueTicket(c, pre));
  }
  checkIn(ps: PrivateState) {
    return this.run('checkIn', ps, (c) => this.contract.impureCircuits.checkIn(c));
  }
  resellTicket(ps: PrivateState, buyerPre: Uint8Array, price: bigint) {
    return this.run('resellTicket', ps, (c) => this.contract.impureCircuits.resellTicket(c, buyerPre, price));
  }
}
