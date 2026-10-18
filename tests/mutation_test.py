# Mutation test for First Whistle. Run: python3 tests/mutation_test.py
# Each mutant is a small deliberate bug in contracts/first_whistle.py. The test suite should FAIL for every mutant ("killed").
# A mutant that still passes ("survived") shows something the tests cannot see.
import os, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "contracts", "first_whistle.py")
source = open(SRC).read()
EQUIVALENT = {}

MUTANTS = [
    ("owner check inverted", "if gl.message.sender_address != self.owner:", "if gl.message.sender_address == self.owner:"),
    ("a reporter may commit twice", "or s in self.slot:", "or s not in self.slot:"),
    ("commitments accepted after the round closes", 'if self.phase != "commit":\n      raise', 'if self.phase == "commit":\n      raise'),
    ("round never closes when full", "if i + 1 == int(self.limit):", "if i + 1 > int(self.limit):"),
    ("round can be closed with one commitment", "int(self.n) < 2", "int(self.n) < 1"),
    ("limit of 1 allowed", "not 2 <= limit <= MAX_ENTRIES", "not 1 <= limit <= MAX_ENTRIES"),
    ("limit above the maximum allowed", "not 2 <= limit <= MAX_ENTRIES", "not 2 <= limit <= MAX_ENTRIES + 5"),
    ("maximum entries raised", "MAX_ENTRIES = 12", "MAX_ENTRIES = 13"),
    ("topic length limit", "1 <= len(topic) <= 120", "1 <= len(topic) <= 1200"),
    ("empty topic allowed", "1 <= len(topic) <= 120", "0 <= len(topic) <= 120"),
    ("settings changeable after commitments", "int(self.n) != 0 or", "int(self.n) < 0 or"),
    ("anyone may reveal", "or s not in self.slot:", "or s in self.slot:"),
    ("claim minimum length", "12 <= len(claim) <= 200", "1 <= len(claim) <= 200"),
    ("claim maximum length", "12 <= len(claim) <= 200", "12 <= len(claim) <= 2000"),
    ("salt length limit", "len(salt) > 64", "len(salt) > 640"),
    ("instruction-like claims accepted", "if INJ.search(claim) is not None:", "if INJ.search(claim) is None:"),
    ("commitment check inverted", "!= e.commitment:", "== e.commitment:"),
    ("commitment not bound to the sender", "sender_hex.lower())", '"")'),
    ("a claim can be revealed twice", 'e.state != "committed" or', 'e.state == "committed" or'),
    ("commitment stored with its case", "commitment=commitment.lower()", "commitment=commitment"),
    ("settle in the wrong phase", 'if self.phase != "reveal":\n      raise gl.vm.UserError("[EXPECTED] not in the reveal phase")', 'if self.phase == "reveal":\n      raise gl.vm.UserError("[EXPECTED] not in the reveal phase")'),
    ("anyone can settle before reveals finish", "len(idx) < int(self.n)", "len(idx) > int(self.n)"),
    ("non-owners can settle early", "gl.message.sender_address != self.owner and len(idx)", "gl.message.sender_address == self.owner and len(idx)"),
    ("settle with nothing revealed", "if not idx:", "if idx:"),
    ("model called for a single candidate", "if len(cands) > 1:", "if len(cands) >= 1:"),
    ("model answer mapped to the wrong entry", 't[k] = cands[res["g"][p]]', 't[k] = res["g"][p]'),
    ("a failed grouping is accepted", 'if not res["ok"]:', 'if res["ok"]:'),
    ("duplicate points at the wrong entry", "u256(idx[t[k]] + 1)", "u256(t[k] + 1)"),
    ("unrevealed entries not voided", 'if e.state == "committed":', 'if e.state == "xcommitted":'),
    ("duplicate index shown wrongly", 'int(e.dup_of) - 1', 'int(e.dup_of) + 1'),
    ("exact repeats compared with case and punctuation", "k = norm(t)", "k = t"),
    ("exact repeats point at the latest copy", "seen.setdefault(k, i)", "seen[k] = i"),
    ("digits stripped from comparisons", "[^a-z0-9 ]", "[^a-z ]"),
    ("chains not resolved", "if j == -1 or out[j] == -1:", "if j == -1 or out[j] != -1:"),
    ("booleans accepted in a grouping", "isinstance(v, bool) or not isinstance(v, int)", "not isinstance(v, int)"),
    ("self references accepted", "v < -1 or v >= i", "v < -1 or v > i"),
    ("values below minus one accepted", "v < -1 or v >= i", "v < -2 or v >= i"),
    ("wrong length accepted", "len(a) != m", "len(a) > m"),
    ("tolerance raised", "MAX_DIFF = 1", "MAX_DIFF = 2"),
    ("tolerance removed", "MAX_DIFF = 1", "MAX_DIFF = 0"),
    ("two failed groupings disagree", 'return leader["ok"] == validator["ok"]', 'return False'),
    ("failed against successful grouping agrees", 'return leader["ok"] == validator["ok"]', 'return True'),
    ("groupings of different length compared", 'len(leader["g"]) == len(validator["g"]) and', ''),
    ("prompt drops the untrusted warning", "UNTRUSTED", "text"),
    ("prompt drops the vague-entry rule", " An earlier entry that is vaguer than a later one does not cover it.", ""),
    ("prompt drops the topic", '"You compare short football transfer scoops. Topic: " + topic', '"You compare short football transfer scoops. Topic: "'),
    ("pattern: ignore previous instructions", r"ignore\s+(all\s+|any\s+|the\s+)?(previous", r"ignorX\s+(all\s+|any\s+|the\s+)?(previous"),
    ("pattern: same as entry", r"(same\s+(story\s+)?as|duplicate\s+of)", r"(samX\s+(story\s+)?as|duplicatX\s+of)"),
    ("pattern: planted key", r'\"?same_as\"?\s*:', r'\"?samX_as\"?\s*:'),
    ("pattern: all later entries", r"\ball\s+(later|other", r"\balX\s+(later|other"),
    ("pattern: mark the rest", r"\bmark\s+(the\s+)?(rest|others|all)\b", r"\bmarX\s+(the\s+)?(rest|others|all)\b"),
]

def run(contract_path):
    tmp = tempfile.mkdtemp()
    try:
        os.makedirs(os.path.join(tmp, "contracts")); shutil.copy(contract_path, os.path.join(tmp, "contracts", "first_whistle.py"))
        shutil.copytree(HERE, os.path.join(tmp, "tests"), ignore=shutil.ignore_patterns("__pycache__"))
        try:
            return subprocess.run([sys.executable, os.path.join(tmp, "tests", "test_first_whistle.py")], capture_output=True, text=True, timeout=20).returncode
        except subprocess.TimeoutExpired:
            return 99  # a hang counts as caught: the tests did not pass
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def main():
    assert run(SRC) == 0, "the unmodified contract must pass the tests first"
    killed, survived, skipped = [], [], []
    for name, old, new in MUTANTS:
        if name in EQUIVALENT: skipped.append((name, "equivalent: " + EQUIVALENT[name])); continue
        if source.count(old) != 1: skipped.append((name, "pattern found %d times" % source.count(old))); continue
        tmp = tempfile.mkdtemp(); m = os.path.join(tmp, "m.py"); open(m, "w").write(source.replace(old, new, 1))
        if subprocess.run([sys.executable, "-m", "py_compile", m], capture_output=True).returncode != 0: skipped.append((name, "does not compile"))
        elif run(m) != 0: killed.append(name)
        else: survived.append(name)
        shutil.rmtree(tmp, ignore_errors=True)
    print("mutants killed: %d of %d" % (len(killed), len(killed) + len(survived)))
    for n in survived: print("  SURVIVED:", n)
    for n, why in skipped: print("  not counted (%s): %s" % (why, n))
    return 0 if not survived else 1

if __name__ == "__main__":
    sys.exit(main())
