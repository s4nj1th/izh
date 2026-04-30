import { cp, stat } from "fs/promises";
import path from "path";

async function copyPkg() {
  const src = path.resolve(process.cwd(), "..", "pkg");
  const dest = path.resolve(process.cwd(), "pkg");
  
  try {
    const srcExists = await stat(src).then(() => true).catch(() => false);
    
    if (!srcExists) {
      console.warn(`Warning: Source ${src} does not exist. Skipping copy.`);
      const destExists = await stat(dest).then(() => true).catch(() => false);
      if (!destExists) {
        console.error(`Error: Destination ${dest} also does not exist. WASM build might have failed.`);
        process.exit(1);
      }
      return;
    }

    await cp(src, dest, { recursive: true, force: true });
    console.log(`Copied ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Failed to copy pkg: ${err}`);
    process.exit(1);
  }
}

copyPkg();
