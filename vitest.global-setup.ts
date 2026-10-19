import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REAL_STORE = path.join(process.cwd(), ".data", "traces.json");

function fingerprint(): string {
  if (!fs.existsSync(REAL_STORE)) return "absent";
  const { mtimeMs } = fs.statSync(REAL_STORE);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(REAL_STORE)).digest("hex");
  return `${hash}:${mtimeMs}`;
}

/** Fails the run if any test changed, created, or deleted the real trace store. */
export default function setup() {
  const before = fingerprint();
  return () => {
    const after = fingerprint();
    if (after !== before) {
      throw new Error(
        `Tests modified ${REAL_STORE} (before: ${before}, after: ${after}). ` +
          "Tests must use a temp store via setTraceStorePathForTests.",
      );
    }
  };
}
