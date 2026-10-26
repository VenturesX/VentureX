import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  run("npx", ["prisma", "generate"]);
  const { PrismaClient } = await import("@prisma/client");
  const { seedClipboard } = await import("../src/lib/clipboard/persist");
  let db = new PrismaClient();

  try {
    const users = await db.user.count();
    if (users === 0) {
      await db.$disconnect();
      console.log("Empty database — pushing and seeding…");
      run("npx", ["prisma", "db", "push", "--skip-generate"]);
      run("npx", ["tsx", "prisma/seed.ts"]);
      return;
    }

    let clipboard = -1;
    try {
      clipboard = await db.clipboardProgram.count();
    } catch {
      clipboard = -1;
    }
    if (clipboard < 0) {
      await db.$disconnect();
      console.log("Updating schema for the curb clipboard…");
      run("npx", ["prisma", "db", "push", "--skip-generate"]);
      db = new PrismaClient();
      clipboard = await db.clipboardProgram.count();
    }
    if (clipboard === 0) {
      await seedClipboard(db);
      console.log(`Database ready (${users} users, clipboard seeded)`);
      return;
    }
    console.log(`Database ready (${users} users)`);
  } catch {
    console.log("Schema missing — pushing and seeding…");
    await db.$disconnect();
    run("npx", ["prisma", "db", "push", "--skip-generate"]);
    run("npx", ["tsx", "prisma/seed.ts"]);
    return;
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
