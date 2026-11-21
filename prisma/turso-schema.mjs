import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.turso first.");
  process.exit(1);
}
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const existing = await client.execute("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_litestream%' and name not like 'libsql_%'");
const fresh = existing.rows.length === 0;
if (!fresh) {
  console.log(`Turso already has ${existing.rows.length} tables, so nothing was changed. To start over, create a new empty Turso database.`);
  process.exit(0);
}
const sql = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", { encoding: "utf8" });
await client.executeMultiple(sql);
const after = await client.execute("select count(*) as n from sqlite_master where type = 'table'");
console.log(`Schema loaded into Turso: ${after.rows[0].n} tables.`);
