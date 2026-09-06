import { spawnSync } from "node:child_process";

if (process.env.SKIP_DEMO_SEED === "1") {
  console.log("maybe-seed: skipped");
  process.exit(0);
}

const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
