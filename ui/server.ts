// Tiny demo UI. The server plays the chain (public ledger) and holds each guest's "wallet"
// (private state) in memory, exactly as a browser wallet would. Secrets are never sent to the page.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { Chain, newSecret, preCommit, hex, type PrivateState } from '../src/tickets.js';

const PORT = Number(process.env.PORT ?? 8799);
let chain: Chain;
let hostSecret = newSecret();
const wallets = new Map<string, PrivateState>();
const log: { ok: boolean; msg: string }[] = [];
const say = (ok: boolean, msg: string) => log.unshift({ ok, msg });

async function reset(max = 5, cap = 5000, resales = 1) {
  hostSecret = newSecret();
  wallets.clear();
  log.length = 0;
  chain = await Chain.deploy(hostSecret, BigInt(max), BigInt(cap), BigInt(resales));
  say(true, `Deployed event contract: ${max} tickets, resale cap $${cap / 100}, ${resales} resale(s) per ticket`);
}
await reset();

const publicView = () => ({
  issued: Number(chain.ledger.issued),
  checkedIn: Number(chain.ledger.checkedIn),
  resold: Number(chain.ledger.resold),
  maxTickets: Number(chain.ledger.maxTickets),
  resaleCap: Number(chain.ledger.resaleCap),
  leaves: Number(chain.ledger.tickets.firstFree()),
  root: String(chain.ledger.tickets.root().field).slice(0, 18) + '…',
  nullifiers: [...chain.ledger.nullifiers].map((n) => hex(n).slice(0, 16) + '…'),
  log,
});

async function act(name: string, fn: () => Promise<string>) {
  try { say(true, await fn()); } catch (e: any) { say(false, `${name} REJECTED: ${String(e.message).replace(/^.*failed assert: /, '')}`); }
}

const body = async (req: http.IncomingMessage) => {
  let s = ''; for await (const c of req) s += c; return s ? JSON.parse(s) : {};
};

http.createServer(async (req, res) => {
  const send = (code: number, data: unknown, type = 'application/json') => {
    res.writeHead(code, { 'content-type': type }); res.end(type === 'application/json' ? JSON.stringify(data) : (data as string));
  };
  const url = req.url ?? '/';
  if (req.method === 'GET' && url === '/') return send(200, readFileSync(new URL('./index.html', import.meta.url), 'utf8'), 'text/html');
  if (req.method === 'GET' && url === '/api/public') return send(200, publicView());
  if (req.method === 'POST') {
    const b = await body(req);
    if (url === '/api/reset') { await reset(b.max, b.cap, b.resales); return send(200, publicView()); }
    if (url === '/api/issue') await act('Issue', async () => {
      const ps: PrivateState = { secret: newSecret(), hops: 0n };
      await chain.issueTicket(hostSecret, preCommit(ps.secret));
      wallets.set(b.name, ps);
      return `Host issued a ticket commitment for "${b.name}" (public: only a hash was added to the tree)`;
    });
    if (url === '/api/checkin') await act(`Check-in for "${b.name}"`, async () => {
      const ps = wallets.get(b.name) ?? { secret: newSecret(), hops: 0n }; // unknown names = stranger with no ticket
      await chain.checkIn(ps);
      return `"${b.name}" proved a valid unused ticket in zero knowledge and is IN. Public ledger learned only a nullifier.`;
    });
    if (url === '/api/resell') await act(`Resale from "${b.from}"`, async () => {
      const seller = wallets.get(b.from); if (!seller) throw new Error('failed assert: no such wallet');
      const buyer: PrivateState = { secret: newSecret(), hops: seller.hops + 1n };
      await chain.resellTicket(seller, preCommit(buyer.secret), BigInt(Math.round(Number(b.price) * 100)));
      wallets.set(b.to, buyer);
      return `"${b.from}" privately resold to "${b.to}" at $${b.price} (within cap). Old ticket is dead, new one is live.`;
    });
    return send(200, publicView());
  }
  send(404, { error: 'not found' });
}).listen(PORT, () => console.log(`Private Tickets demo on http://localhost:${PORT}`));
