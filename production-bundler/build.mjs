import { build } from "esbuild";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

if (existsSync("dist")) {
    await rm("dist", { recursive: true });
}

const shared = {
    bundle: false,
    entryPoints: ["src/index.ts"],
    logLevel: "info",
    minify: false,
    sourcemap: false,
};

await build({
    ...shared,
    outfile: "dist/index.cjs",
    format: "cjs",
    platform: "node",
});

await build({
    ...shared,
    outfile: "dist/index.mjs",
    format: "esm",
    platform: "node",
});
