import { cp } from "fs/promises";
import path from "path";

async function copyPkg() {
  const src = path.resolve(process.cwd(), "..", "pkg");
  const dest = path.resolve(process.cwd(), "pkg");
  try {
    await cp(src, dest, { recursive: true, force: true });
    console.log(`Copied ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Failed to copy pkg: ${err}`);
    process.exit(1);
  }
}

copyPkg();
