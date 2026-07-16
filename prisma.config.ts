import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma 7 dropped schema-level directUrl, so the CLI (migrate/studio/seed) uses the
    // unpooled connection here. The running app uses the pooled DATABASE_URL instead — see
    // lib/prisma.ts, which builds its own adapter from DATABASE_URL, independent of this file.
    url: env("DIRECT_URL"),
  },
});
