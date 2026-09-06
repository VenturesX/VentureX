import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "";
const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const isPostgres = /^postgres(ql)?:\/\//i.test(url);

if (!isPostgres) {
  console.log("prisma-adapt: local SQLite");
  process.exit(0);
}

const schema = fs.readFileSync(schemaPath, "utf8");
if (!schema.includes('provider = "sqlite"')) {
  console.log("prisma-adapt: already PostgreSQL");
  process.exit(0);
}

fs.writeFileSync(schemaPath, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
console.log("prisma-adapt: switched Prisma provider to postgresql for this build");
