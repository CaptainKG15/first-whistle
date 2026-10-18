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

## Bradbury: open
The page can run a round there: the owner's wallet sends 0.002 test GEN to each throwaway reporter key, and the reporters then commit and reveal from those keys. This path has been tested against a simulated chain and a pretend wallet only; nobody has used it with a real wallet.
