// Generate REAL zero-knowledge proofs for each circuit with Midnight's proof server (9.0.0).
// Usage: PROOF_SERVER=http://localhost:6300 npm run prove
// The proof server is the official one: `docker run -p 6300:6300 midnightntwrk/proof-server:9.0.0`
// (or built from midnightntwrk/midnight-ledger tag proof-server-9.0.0).
import { readFileSync } from 'node:fs';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { createProvingPayload, createCheckPayload, parseCheckResult } from '@midnight-ntwrk/ledger-v9';
import { Chain, newSecret, preCommit, type PrivateState } from '../src/tickets.js';

const SERVER = process.env.PROOF_SERVER ?? 'http://localhost:6300';
const M = new URL('../contract/managed/private-tickets/', import.meta.url).pathname;

const material = (c: string) => ({
  proverKey: new Uint8Array(readFileSync(`${M}keys/${c}.prover`)),
  verifierKey: new Uint8Array(readFileSync(`${M}keys/${c}.verifier`)),
  ir: new Uint8Array(readFileSync(`${M}zkir/${c}.bzkir`)),
});

async function prove(chain: Chain, circuit: string) {
  const t = chain.lastProofData;
  const pre = RT.proofDataIntoSerializedPreimage(t.input, t.output, t.publicTranscript, t.privateTranscriptOutputs, circuit);
  const km = material(circuit);
  const chk = await fetch(`${SERVER}/check`, { method: 'POST', body: createCheckPayload(pre, km.ir) as any });
  if (!chk.ok) throw new Error(`/check failed for ${circuit}: ${await chk.text()}`);
  parseCheckResult(new Uint8Array(await chk.arrayBuffer()));
  const t0 = Date.now();
  const res = await fetch(`${SERVER}/prove`, { method: 'POST', body: createProvingPayload(pre, undefined, km) as any });
  if (!res.ok) throw new Error(`/prove failed for ${circuit}: ${await res.text()}`);
  const proof = new Uint8Array(await res.arrayBuffer());
  console.log(`  ✓ ${circuit}: constraint check passed, ZK proof generated (${proof.length} bytes, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

const hostSecret = newSecret();
const chain = await Chain.deploy(hostSecret, 5n, 5000n, 1n);
const alice: PrivateState = { secret: newSecret(), hops: 0n };
const bob: PrivateState = { secret: newSecret(), hops: 1n };
console.log(`Proof server: ${SERVER}`);
await chain.issueTicket(hostSecret, preCommit(alice.secret));
await prove(chain, 'issueTicket');
await chain.resellTicket(alice, preCommit(bob.secret), 4500n);
await prove(chain, 'resellTicket');
await chain.checkIn(bob);
await prove(chain, 'checkIn');
console.log('All three circuits proved for real. checkIn public inputs: root + nullifier only.');
