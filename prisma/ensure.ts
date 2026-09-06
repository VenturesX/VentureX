import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  run("npx", ["prisma", "generate"]);
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const users = await db.user.count();
    if (users > 0) {
      console.log(`Database ready (${users} users)`);
      return;
    }
  } catch {
    console.log("Schema missing — pushing and seeding…");
  }

  await db.$disconnect();
  run("npx", ["prisma", "db", "push", "--skip-generate"]);
  run("npx", ["tsx", "prisma/seed.ts"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
