#!/usr/bin/env node
/**
 * Database initialization script
 * Run this on application startup to ensure the 5e_data table exists and is populated
 *
 * Usage: node scripts/init-db.js
 *
 * In development: Uses tsx to run TypeScript files directly
 * In production: Uses compiled JavaScript files from dist/
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
};

const isDevelopment = () => {
  return process.env.NODE_ENV !== "production" && !fs.existsSync(path.join(process.cwd(), "dist"));
};

const initialize = async () => {
  try {
    const isDevEnv = isDevelopment();
    const environment = isDevEnv ? "development" : "production";

    console.log(`\n========== Running in ${environment} mode ==========\n`);

    // First, run migrations to ensure table exists
    console.log("========== Running database migrations ==========\n");
    await runCommand("npm", ["run", "db:migrate"]);

    // Then run the initialization script
    console.log("\n========== Initializing database data ==========\n");

    if (isDevEnv) {
      // Development: Use tsx to run TypeScript directly
      await runCommand("npx", ["tsx", "src/lib/db/init.ts"]);
    } else {
      // Production: Also use tsx (simpler than managing compiled JS)
      await runCommand("npx", ["tsx", "src/lib/db/init.ts"]);
    }

    console.log("\n========== Database initialization complete ==========\n");
    process.exit(0);
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  }
};

initialize();
