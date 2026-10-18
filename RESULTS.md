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

## On a real network: open
Not run yet when this was written. This section will record the real rounds (what the validators grouped, whether they reached consensus, how long it took) with failures included.
- **Studio:** open.
- **Bradbury:** open. The page can run a round there: the owner's wallet sends 0.002 test GEN to each throwaway reporter key, and the reporters then commit and reveal from those keys. This path has been tested against a simulated chain and a pretend wallet only; nobody has used it with a real wallet.
