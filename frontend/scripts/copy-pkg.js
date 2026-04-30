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
    
    // Also copy the .wasm file to public directory for the browser to find
    const wasmSrc = path.join(dest, "vizlang_bg.wasm");
    const wasmDest = path.join(process.cwd(), "public", "vizlang_bg.wasm");
    await cp(wasmSrc, wasmDest, { force: true });
    console.log(`Copied ${wasmSrc} -> ${wasmDest}`);
  } catch (err) {
    console.error(`Failed to copy pkg: ${err}`);
    process.exit(1);
  }
}

copyPkg();
