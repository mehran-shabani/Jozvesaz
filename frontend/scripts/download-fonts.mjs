#!/usr/bin/env node
import { mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";

const fonts = [
  {
    url: "https://github.com/vercel/geist-font/raw/main/packages/next/font/local/GeistVF.woff",
    filename: "GeistVF.woff",
  },
  {
    url: "https://github.com/vercel/geist-font/raw/main/packages/next/font/local/GeistMonoVF.woff",
    filename: "GeistMonoVF.woff",
  },
];

const targetDir = path.join(process.cwd(), "app", "fonts");

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function downloadFont({ url, filename }) {
  const destination = path.join(targetDir, filename);
  if (await fileExists(destination)) {
    console.log(`✔ ${filename} already exists, skipping.`);
    return;
  }

  console.log(`⬇ Downloading ${filename}...`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${filename}: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(destination));
  console.log(`✅ Saved ${filename}`);
}

async function main() {
  await mkdir(targetDir, { recursive: true });
  for (const font of fonts) {
    await downloadFont(font);
  }
  console.log("All fonts are ready!\nRemember to restart the dev server if it was running.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
