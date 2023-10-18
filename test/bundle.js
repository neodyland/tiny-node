import { bundle } from "production-bundler";

await bundle({
    externalPackages: ["sharp"],
    outDir: "dist",
    outFile: "bundle.js",
    entryPoints: ["src/index.ts"],
    format: "esm",
    maindir: import.meta.url,
});
