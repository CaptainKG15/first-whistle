# First Whistle

**A priority registry for "who broke it first", when the same story is told in different words.**

Every transfer window has the same dispute: three reporters publish the same story in different words, and each says they were first. First Whistle settles it on-chain. Reporters commit a hash of their scoop in secret, so the order is fixed by the chain and nobody can copy or edit. After the reveal, validators decide which scoops are the **same story**. The first committer of each story is credited, and the others are recorded as duplicates of it.

The primitive is general: bug bounties (first unique report wins), idea contests, grant applications and research priority claims all have the same "first, by meaning" problem. Football transfers are the flagship example, and the demo uses invented players and clubs.

Testnet only.

## How it works
1. **Commit.** Each reporter calls `commit(hash)`, where the hash is `sha256(claim|salt|sender address)`. Binding the sender stops anyone resubmitting someone else's hash. One commitment per address. The index of a commitment is its priority.
2. **Reveal.** After the round closes (it closes by itself when full, or the owner closes it), each reporter calls `reveal(claim, salt)`. The contract recomputes the hash. Scoops that read like instructions to the model are refused.
3. **Settle.** Anyone may settle once everyone has revealed, and the owner may settle early. Entries that never revealed become `void`.

## How consensus is used
The one question that code cannot answer is "do these two scoops report the same story?". That is the only thing the validators decide.
- Plain code first removes **exact repeats** (same text once case, punctuation and spacing are ignored). They are marked as duplicates of the first copy and are never sent to the model.
- The remaining distinct scoops are sent to the model **in commit order** in one call. For each one it names the earlier entry that reports the same story, or `-1` if it is new. "Same story" means the same player, the same destination club and the same kind of move (permanent, loan, extension); an earlier entry that is vaguer than a later one does not cover it.
- The leader and each validator run that call independently. **The custom equivalence check** (`same_groups`) accepts a validator's grouping if it differs from the leader's on **at most one entry**. That tolerance is deliberate: borderline scoops should not stall the round, and the leader's grouping is the one stored.
- If the leader's answer cannot be parsed (wrong length, forward references, booleans), the grouping fails and the whole settle is rolled back, so a garbled answer can never credit the wrong person. Two failed groupings agree with each other; a failure against a success does not.
- Plain code then resolves chains ("B is the same as A, C is the same as B" becomes "B and C are duplicates of A"), maps results back to the original entries, and records them.

## State design
`entries` (author, commitment, claim, state, duplicate-of), `slot` (one entry per address), `phase` (`commit`, `reveal`, `settled`), `topic`, `limit` (2 to 12). One contract holds one round. States: `committed`, `revealed`, `unique`, `duplicate`, `void`.

## Testing
- `python3 tests/test_first_whistle.py`: 100 off-chain checks. A stand-in network replaces the real one, so they test the contract's logic, not the model.
- `python3 tests/mutation_test.py`: breaks the contract in 51 small ways and confirms the tests fail each time. **51 of 51 caught.** One of the breaks (allowing a self-reference in the grouping) made the chain-resolving loop hang, which led to bounding that loop so malformed input can no longer hang it.
- The page's commitment hash was checked against the contract's for accented text and mixed-case addresses: identical.

## Honest limits
- The model decides "same story". It can group two different stories or split one, and the one-entry tolerance means validators may differ slightly. This is tested only with a stand-in, so see `RESULTS.md` for what has been observed on a real network.
- An attacker could commit a vague early scoop hoping to absorb later specific ones. The prompt says a vaguer earlier entry does not cover a later one, but that is the model's judgement, not a guarantee.
- One round per contract. Commit order is the chain's order, so a reporter who commits late is late.
- Scoops are public after the reveal. Nothing here checks whether a scoop turned out to be **true**; it settles priority, not accuracy.
- Entries are capped at 12 per round, which keeps the model's task and the settle transaction small.
- The Bradbury demo uses throwaway reporter keys funded from the owner's wallet. It shows the contract working with several accounts; it is not a model of real reporters.

## Run it
Host the folder on GitHub Pages and open `app/index.html`.
- **Studio (no wallet):** press **Deploy a new round**, then **Run the whole round**. Six simulated reporters, each a throwaway key, commit, reveal, and the validators settle it.
- **Bradbury (a browser wallet and a little test GEN):** connect through **Deploy a new round**, which makes your wallet the owner. Pick 3 or 6 reporters, press **Fund the reporters** (it sends 0.002 test GEN to each throwaway reporter key so they can pay gas, one wallet approval each), then **Run the whole round**. Allow about five minutes for three reporters. Whatever the reporters do not spend stays in their keys, a few thousandths of test GEN.

`build_app.py` rebuilds the page from `app/index.src.html` with the contract embedded. `tests/ui_test.js` checks the page in a browser against a simulated chain and a pretend wallet (16 checks); it does not use a real network.

## Files
- `contracts/first_whistle.py`: the contract, 8,481 bytes, SHA-256 `4e120730e97fef41ee53ad8797acfca863e5409521c9d6f1040c000a64279945`
- `tests/`: the tests and the mutation test
- `app/`: the demo page
