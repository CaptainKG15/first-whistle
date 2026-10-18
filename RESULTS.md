# Results

Only what was observed is listed. Open items are marked open.

## Off-chain (contract SHA-256 starting `4e120730e97fef41`, 8,481 bytes)
- 100 checks pass.
- 51 of 51 mutants caught. A mutant that allowed a self-reference in the grouping made the chain-resolving loop hang; the loop is now bounded, and a test confirms it cannot hang on a malformed list.
- The browser's commitment hash and the contract's are identical for four test cases, including accented text and a mixed-case address.
- The demo page ran a full round (deploy, six commitments, six reveals, settle) against a simulated chain that enforces the contract's rules and recomputes each commitment independently. The simulated chain grouped by a simple rule, so this shows the page and the contract's flow agree, not how the model behaves.

## First attempt on Studio: stopped by a network error
Round `0xE12DFFD2b42d960ee86EfdF2bE172601Eb56698E`. Deployed in about five seconds. The owner opened the round, and Ana Rivers' and Tom Hale's commitments were accepted. Priya Nair's commit failed with "An unknown RPC error occurred."

- **This was a Studio network error, not a contract refusal.** The contract rejected nothing.
- The page used at the time stopped at the first error, could not continue, and had not kept the secret salts, so the two committed scoops could never be revealed. That round was abandoned.
- The page now retries transient errors, checks the chain before every step so nothing is done twice, and saves the scoops and salts in the browser so a stopped run can continue. These changes are tested only against a simulated chain. A real run with the fixed page is still open.

## Studio: a full round with real validators (worked)
Contract `0x19516b470D7267f5DA64971C4A36B1281c7D2c4A`, deployed from the page (8,481 bytes, SHA-256 starting `4e120730e97fef41`). Six reporters, each a throwaway key, with invented scoops. Times are the page's clock.

| Time | Event |
|---|---|
| 9:25:42 | round deployed |
| 9:25:55 | owner opened the round (six reporters) |
| 9:26:03 to 9:26:57 | six commitments accepted, about eight seconds each; the round moved to the reveal phase when it filled |
| 9:27:07 to 9:29:34 | six reveals accepted |
| 9:29:43 | owner asked the validators to settle |
| 9:29:57 | settle accepted (about 14 seconds) |
| 9:29:58 | settled: 4 first to report, 2 duplicates |

| # | Reporter | Scoop | Result |
|---|---|---|---|
| 1 | Ana Rivers | Marco Valenti set to join Harbor City on a five-year deal | FIRST |
| 2 | Tom Hale | Harbor City agree fee for striker Marco Valenti, medical tomorrow | DUPLICATE OF #1 |
| 3 | Priya Nair | Kai Okonkwo to Northgate Rovers on loan until June | FIRST |
| 4 | Leo Brandt | Valenti to Harbor City, here we go! Five year contract | DUPLICATE OF #1 |
| 5 | Sam Okafor | Kai Okonkwo joins Northgate Rovers permanently for 12m | FIRST |
| 6 | Jess Moreau | A big club are close to signing a striker | FIRST |

The validators' grouping matches the one the demo was designed around: the three Valenti scoops are one story, the loan and the permanent move are separate stories, and the vague rumour is not absorbed into any other.

**The network hiccuped, and the page coped.** About 15 reads failed with transient network errors and were retried. One write, Sam Okafor's reveal, reported a network error, but the page checked the chain, found the reveal had already been applied ("already done"), and moved on without sending it twice. That is the case the resume logic was written for after the first attempt, and it happened for real.

What this shows and does not show:
- It shows commit, reveal and settle working on a real network, validators reaching consensus on the grouping, the equivalence check accepting it, and credit going to the earlier committer.
- It is **one run** of six scoops. It says nothing about how often validators disagree, about other wordings, or about longer rounds. From outside, it cannot be told whether the one-entry tolerance was needed.
- Bradbury has not been run.

## Bradbury: a full round with real validators and a real wallet (worked)
Contract `0xdb04f22724fB8293eFC53C30CeDeF53EA527690c`, deployed from the page with a browser wallet (8,481 bytes, SHA-256 starting `4e120730e97fef41`). Three reporters, each a throwaway key funded with 0.002 test GEN from the wallet. Times are the page's clock.

| Time | Event |
|---|---|
| 9:45:17 | round deployed (about 20 seconds after the click) |
| 9:45:26 to 9:45:39 | three funding transfers of 0.002 test GEN sent and arrived |
| 9:46:06 | owner opened the round |
| 9:46:17 to 9:46:54 | three commitments accepted; the round moved to the reveal phase when it filled |
| 9:47:09 to 9:47:53 | three reveals accepted |
| 9:47:57 | owner asked the validators to settle |
| 9:48:18 | settle accepted (about 21 seconds) |
| 9:48:19 | settled: 2 first to report, 1 duplicate |

| # | Reporter | Scoop | Result |
|---|---|---|---|
| 1 | Ana Rivers | Marco Valenti set to join Harbor City on a five-year deal | FIRST |
| 2 | Tom Hale | Harbor City agree fee for striker Marco Valenti, medical tomorrow | DUPLICATE OF #1 |
| 3 | Priya Nair | Kai Okonkwo to Northgate Rovers on loan until June | FIRST |

From deploy to settled took about three minutes. The throwaway reporter keys paid their own gas on Bradbury, so the funding approach works with a real wallet.

**One rough edge.** Right after the deploy the tape showed `ERROR: Requested resource not found.` The page had read the brand-new contract before the network could serve it. It was harmless and the run continued, but it should not appear on a successful deploy. The page now treats that as a transient error and retries the read; a browser check covers it against a simulated chain only.

What this shows and does not show: the whole flow works on Bradbury with real validators and a real wallet, and the grouping is the intended one. It is one run of three scoops. It says nothing about how often validators disagree or about longer rounds.
