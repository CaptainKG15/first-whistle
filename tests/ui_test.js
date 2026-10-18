// Browser checks for the First Whistle demo page. Needs playwright and a local web server on port 8124 serving this folder:
//   python3 -m http.server 8124   (from the project root), then   node tests/ui_test.js
const { chromium } = require("playwright");
const STUB = `
const chainState = globalThis.__chain = globalThis.__chain || { phase: "commit", topic: "football transfer news", limit: 12, owner: null, entries: [], slot: {} };
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
const story = (t) => /valenti/i.test(t) ? "A" : /okonkwo/i.test(t) && /permanent/i.test(t) ? "C" : /okonkwo/i.test(t) ? "B" : "V:" + t;
const map = (o) => new Map(Object.entries(o));
const meOf = (o) => !o || !o.account ? null : (typeof o.account === "string" ? o.account : o.account.address);
export function generatePrivateKey() { return "0x" + [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, "0")).join(""); }
export function createAccount(pk) { return { address: "0x" + pk.slice(2, 42) }; }
export function createClient(o) { const me = meOf(o); return {
  connect: async () => {}, initializeConsensusSmartContract: async () => { globalThis.__inits = (globalThis.__inits || 0) + 1; },
  deployContract: async () => { chainState.owner = me; return "0x" + "8".repeat(64); },
  waitForTransactionReceipt: async () => ({ data: { contract_address: "0x" + "d".repeat(40) } }),
  readContract: async ({ functionName: f, args }) => {
    if (globalThis.__notFound > 0) { globalThis.__notFound--; throw new Error("Requested resource not found."); }
    if (f === "get_round") { const e = chainState.entries; return map({ owner: chainState.owner, topic: chainState.topic, phase: chainState.phase, limit: BigInt(chainState.limit), count: BigInt(e.length), revealed: 0n, unique: BigInt(e.filter((x) => x.state === "unique").length), duplicates: BigInt(e.filter((x) => x.state === "duplicate").length) }); }
    if (f === "get_entry") { const x = chainState.entries[Number(args[0])]; return map({ index: args[0], author: x.author, state: x.state, claim: x.claim, dup_of: BigInt(x.dup_of), commitment: x.commitment }); } },
  writeContract: async ({ functionName: f, args }) => {
    if (globalThis.__failBefore > 0) { globalThis.__failBefore--; throw new Error("An unknown RPC error occurred."); }
    if (f === "commit" && globalThis.__hardAtCommit) { globalThis.__commitCalls = (globalThis.__commitCalls || 0) + 1; if (globalThis.__commitCalls === globalThis.__hardAtCommit) { globalThis.__hardAtCommit = 0; throw new Error("boom: the validators refused"); } }
    const s = chainState;
    if (f === "configure") { if (me !== s.owner) throw new Error("owner only"); s.topic = args[0]; s.limit = Number(args[1]); }
    else if (f === "commit") { if (s.phase !== "commit") throw new Error("not accepting"); if (s.slot[me] !== undefined) throw new Error("repeated"); s.slot[me] = s.entries.length; s.entries.push({ author: me, commitment: args[0], claim: "", state: "committed", dup_of: -1 }); if (s.entries.length === s.limit) s.phase = "reveal"; }
    else if (f === "reveal") { if (s.phase !== "reveal") throw new Error("cannot reveal now"); const e = s.entries[s.slot[me]]; if (await sha(args[0] + "|" + args[1] + "|" + me.toLowerCase()) !== e.commitment) throw new Error("does not match the commitment"); e.claim = args[0]; e.state = "revealed"; }
    else if (f === "settle") { if (s.phase !== "reveal") throw new Error("not in the reveal phase"); const seen = {}; s.entries.forEach((e, i) => { if (e.state !== "revealed") { e.state = "void"; return; } const k = story(e.claim); if (seen[k] === undefined) { seen[k] = i; e.state = "unique"; } else { e.state = "duplicate"; e.dup_of = seen[k]; } }); s.phase = "settled"; }
    if (globalThis.__applyThenFail) { globalThis.__applyThenFail = false; throw new Error("An unknown RPC error occurred."); }
    return "0x" + "7".repeat(64); } }; }
export const studionet = {}; export const testnetBradbury = {}; export const TransactionStatus = { ACCEPTED: "ACCEPTED" };`;
const WALLET = "0xa82b922E107b75f374D36946Cd446613bF38f522"; const balances = {};
async function open(b, { wallet = false, w = 1280, h = 900 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.errs = []; p.on("pageerror", (e) => p.errs.push(e.message));
  await p.exposeFunction("__credit", (to, hex) => { const k = to.toLowerCase(); balances[k] = (balances[k] || 0n) + BigInt(hex); });
  if (wallet) await ctx.addInitScript((addr) => { window.__calls = []; window.__sent = []; window.ethereum = { request: async ({ method, params }) => { window.__calls.push(method); if (method === "eth_requestAccounts") return [addr]; if (method === "eth_chainId") return "0x107d";
    if (method === "eth_sendTransaction") { window.__sent.push(params[0]); await window.__credit(params[0].to, params[0].value); return "0x" + "9".repeat(64); } if (method === "eth_getTransactionReceipt") return { status: "0x1" }; return null; }, on: () => {} }; }, WALLET);
  await p.route(/esm\.sh\/genlayer-js/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: STUB }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route("https://rpc-bradbury.genlayer.com/**", (r) => { const a = String(JSON.parse(r.request().postData()).params[0]).toLowerCase(); r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" + (balances[a] || 0n).toString(16) }) }); });
  return p;
}
let bad = 0; const ok = (n, c, x = "") => { console.log((c ? "PASS " : "FAIL ") + n + (x ? "  -> " + x : "")); if (!c) bad++; };
(async () => {
  const b = await chromium.launch(); const url = "http://localhost:8124/app/index.html"; const txt = async (p, s) => ((await p.textContent(s)) || "").replace(/\s+/g, " ").trim();
  // Studio, six reporters
  let p = await open(b); await p.goto(url); await p.waitForTimeout(500);
  ok("Studio: six reporters by default, no fund button", (await p.locator(".rep").count()) === 6 && !(await p.isVisible("#bFund")));
  await p.click("#bDeploy"); await p.waitForTimeout(500); await p.click("#bRun"); await p.waitForTimeout(7000);
  const rows = await p.locator(".tick .pill").allTextContents();
  ok("Studio: the full round settles as designed", rows.join("|") === "FIRST|DUPLICATE OF #1|FIRST|DUPLICATE OF #1|FIRST|FIRST", rows.join("|"));
  ok("Studio: no page errors", p.errs.length === 0, p.errs.join("; "));
  // Bradbury, three reporters, wallet
  p = await open(b, { wallet: true }); await p.goto(url + "?network=bradbury"); await p.waitForTimeout(600);
  ok("Bradbury: defaults to three reporters and shows the fund button", (await p.locator(".rep").count()) === 3 && (await p.isVisible("#bFund")) && (await p.inputValue("#nRep")) === "3");
  ok("Bradbury: the hint explains funding", (await txt(p, "#runHint")).includes("Fund the reporters"));
  await p.click("#bDeploy"); await p.waitForTimeout(700);
  ok("Bradbury: the wallet deployed the round", /^0x[0-9a-f]{40}$/i.test(await p.inputValue("#addr")) && (await txt(p, "#who")).includes("Wallet (owner)"));
  await p.click("#bRun"); await p.waitForTimeout(800);
  ok("Bradbury: running before funding is refused with a clear reason", (await txt(p, "#log")).includes("Press Fund the reporters first") && (await p.locator(".rep .st", { hasText: "needs test GEN" }).count()) === 3);
  await p.click("#bFund"); await p.waitForTimeout(1500);
  const sent = await p.evaluate(() => window.__sent);
  ok("Bradbury: three wallet transfers of exactly 0.002 test GEN", sent.length === 3 && sent.every((t) => t.value === "0x" + (2n * 10n ** 15n).toString(16) && t.from === "0xa82b922E107b75f374D36946Cd446613bF38f522"), JSON.stringify(sent.map((t) => t.value)));
  ok("Bradbury: each reporter shows as funded", (await p.locator(".rep .st", { hasText: "funded" }).count()) === 3);
  await p.click("#bFund"); await p.waitForTimeout(1200);
  ok("Bradbury: pressing fund again does not send more", (await p.evaluate(() => window.__sent.length)) === 3);
  await p.click("#bRun"); await p.waitForTimeout(6000);
  const rows2 = await p.locator(".tick .pill").allTextContents();
  ok("Bradbury: the three-reporter round settles", rows2.join("|") === "FIRST|DUPLICATE OF #1|FIRST", rows2.join("|"));
  ok("Bradbury: the team sheet counts it", (await txt(p, "#rUnique")) === "2" && (await txt(p, "#rDup")) === "1");
  ok("Bradbury: the consensus setup ran once per account, not once per call", (await p.evaluate(() => globalThis.__inits)) <= 5, "setups: " + await p.evaluate(() => globalThis.__inits));
  ok("Bradbury: no page errors", p.errs.length === 0, p.errs.join("; "));
  await p.screenshot({ path: "/tmp/shots/fw_bradbury.png", fullPage: true });
  // switching networks resets the defaults
  await p.click('[data-net="studionet"]'); await p.waitForTimeout(300);
  ok("switching to Studio restores six reporters and hides the fund button", (await p.locator(".rep").count()) === 6 && !(await p.isVisible("#bFund")));
  // phone
  const m = await open(b, { wallet: true, w: 390, h: 844 }); await m.goto(url + "?network=bradbury"); await m.waitForTimeout(700);
  ok("phone: no sideways scrolling", await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  // resilience on Studio: transient errors, an error after a step applied, and a hard stop that is resumed
  const fresh = async () => { const q = await open(b); await q.addInitScript(() => { window.__fastSleep = true; }); await q.goto(url); await q.waitForTimeout(400); await q.click("#bDeploy"); await q.waitForTimeout(500); return q; };
  const pills = async (q) => (await q.locator(".tick .pill").allTextContents()).join("|"); const GOOD = "FIRST|DUPLICATE OF #1|FIRST|DUPLICATE OF #1|FIRST|FIRST";
  let q = await fresh(); await q.evaluate(() => { globalThis.__failBefore = 3; }); await q.click("#bRun"); await q.waitForTimeout(6000);
  ok("three network errors in a row are retried and the round still settles", (await pills(q)) === GOOD, await pills(q)); ok("the tape says it retried", (await txt(q, "#log")).includes("hiccuped"));
  q = await fresh(); await q.evaluate(() => { globalThis.__applyThenFail = true; }); await q.click("#bRun"); await q.waitForTimeout(6000);
  ok("an error after a step already applied does not cause a double step", (await pills(q)) === GOOD && (await q.evaluate(() => globalThis.__chain.entries.length)) === 6, await pills(q));
  ok("the page noticed the step was already done", (await txt(q, "#log")).includes("already done"));
  q = await fresh(); await q.evaluate(() => { globalThis.__hardAtCommit = 3; }); await q.click("#bRun"); await q.waitForTimeout(2500);
  ok("a hard failure stops the run and says how to continue", (await txt(q, "#log")).includes("Press Run the whole round again") && (await q.evaluate(() => globalThis.__chain.entries.length)) === 2);
  ok("the sealed entries are still shown after the stop", (await q.locator(".tick.committed").count()) === 2);
  await q.fill("#scoop0", "SOMETHING COMPLETELY DIFFERENT THAT WOULD BREAK THE HASH"); await q.click("#bRun"); await q.waitForTimeout(6000);
  ok("pressing Run again continues and settles", (await pills(q)) === GOOD, await pills(q));
  ok("each reporter committed exactly once", (await q.evaluate(() => new Set(globalThis.__chain.entries.map((e) => e.author)).size)) === 6);
  ok("the resumed run used the original scoop, not the edited one", (await q.evaluate(() => globalThis.__chain.entries[0].claim)).startsWith("Marco Valenti"));
  ok("no page errors in the resilience runs", q.errs.length === 0, q.errs.join("; "));
  q = await open(b); await q.goto(url); await q.waitForTimeout(400); await q.click("#bDeploy"); await q.waitForTimeout(500); await q.evaluate(() => { localStorage.clear(); });
  await q.evaluate(() => { const s = globalThis.__chain; s.limit = 6; s.entries.push({ author: "0x" + "5".repeat(40), commitment: "x", claim: "", state: "committed", dup_of: -1 }); s.slot["0x" + "5".repeat(40)] = 0; }); await q.click("#bRun"); await q.waitForTimeout(800);
  ok("a round started somewhere else is refused with a clear reason", (await txt(q, "#log")).includes("started somewhere else"));
  q = await open(b); await q.addInitScript(() => { window.__fastSleep = true; }); await q.goto(url); await q.waitForTimeout(400); await q.evaluate(() => { globalThis.__notFound = 2; }); await q.click("#bDeploy"); await q.waitForTimeout(1500);
  ok("a brand-new contract that is not readable yet is retried, with no error shown", !(await txt(q, "#log")).includes("ERROR") && (await txt(q, "#log")).includes("hiccuped") && (await txt(q, "#rPhase")) === "commit", (await txt(q, "#rPhase")));
  console.log(bad ? "\n" + bad + " FAILED" : "\nall checks passed"); await b.close(); process.exit(bad ? 1 : 0);
})();
