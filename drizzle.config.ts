import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please configure it in your env.");
}

export default defineConfig({
  // Folder where Drizzle will generate SQL migration files
  out: "./migrations",

  // Path to your schema file
  schema: "./shared/schema.ts",

  // Database type
  dialect: "postgresql",

  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Optional but recommended
  verbose: true,
  strict: true,
});
