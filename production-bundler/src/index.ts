import { type Plugin, build } from "esbuild";
import { minify } from "terser";
import { writeFile, rm, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { type SpawnOptions, spawn } from "node:child_process";
import { glob } from "glob";
import { join, resolve } from "node:path";
import { parse as cparse } from "comment-json";

function JSONparse(str: string): any {
    return cparse(str, undefined, true);
}

async function globDo(
    pattern: string | string[],
    fn: (path: string) => void,
    excludePattern?: string | string[],
) {
    console.log(`Processing for ${pattern}`);
    const matches = await glob(pattern, {
        nodir: true,
        dot: true,
        ignore: excludePattern,
    });
    await Promise.all(matches.map(async (path) => fn(path)));
    console.log(`Processed ${matches.length} files`);
}

async function exec(cmd: string, options: SpawnOptions): Promise<undefined> {
    options = { shell: true, stdio: "inherit", ...options };
    console.log(`$ ${cmd}`);
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, options);
        proc.on("close", (code) => {
            if (code === 0) {
                resolve(undefined);
            } else {
                reject(code);
            }
        });
    });
}

function trimPath(p: string) {
    return p.replace(/\\/g, "/");
}

async function resolveDependencies(deps: string[]) {
    const resolved: Record<string, string> = {};
    const pjson = JSONparse(await readFile("./package.json", "utf-8"));
    for (const dep of deps) {
        resolved[dep] = pjson.dependencies[dep];
    }
    return resolved;
}

let maindir = import.meta.url;

const jsdomPatch: Plugin = {
    name: "jsdom-patch",
    setup(build) {
        const doRequire =
            typeof require === "undefined" ? createRequire(maindir) : require;
        build.onLoad({ filter: /XMLHttpRequest-impl\.js$/ }, async (args) => {
            let contents = await readFile(args.path, "utf8");
            contents = contents.replace(
                'const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;',
                `const syncWorkerFile = "${trimPath(
                    doRequire.resolve(
                        "jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js",
                    ),
                )}";`,
            );
            return { contents, loader: "js" };
        });
    },
};

export interface BundleOptions {
    externalPackages?: string[];
    patchJSDOM?: boolean;
    outDir: string;
    entryPoints: string[];
    outFile: string;
    excludeNodeModulesCompress?: string | string[];
    noNodeModulesCompress?: boolean;
    format: "esm" | "cjs";
    installCmd?: string;
    pruneCmd?: string;
    maindir: string;
    removeEmptyDirs?: boolean;
}

const banner = {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
};

export async function bundle(opt: BundleOptions) {
    maindir = opt.maindir;
    if (existsSync(opt.outDir)) {
        await rm(opt.outDir, { recursive: true });
    }
    await build({
        bundle: true,
        minify: true,
        logLevel: "info",
        format: opt.format,
        platform: "node",
        external: opt.externalPackages,
        plugins: opt.patchJSDOM === false ? undefined : [jsdomPatch],
        banner: opt.format == "esm" ? banner : undefined,
        entryPoints: opt.entryPoints,
        outfile: join(opt.outDir, opt.outFile),
    });
    await writeFile(
        join(opt.outDir, "package.json"),
        JSON.stringify({
            type: opt.format === "esm" ? "module" : "commonjs",
            dependencies: await resolveDependencies(opt.externalPackages ?? []),
        }),
    );
    await exec(opt.installCmd ?? "npm i", { cwd: opt.outDir });
    await exec(opt.pruneCmd ?? "npm prune --omit=dev", { cwd: opt.outDir });
    if (!opt.noNodeModulesCompress) {
        await globDo(
            [
                trimPath(join(opt.outDir, "**/*.mjs")),
                trimPath(join(opt.outDir, "**/*.js")),
                trimPath(join(opt.outDir, "**/*.cjs")),
            ],
            async (file) => {
                const min = await minify(
                    await readFile(file, { encoding: "utf-8" }),
                    {
                        mangle: true,
                        compress: true,
                        format: {
                            comments: false,
                        },
                    },
                );
                if (min.code) {
                    await writeFile(file, min.code);
                }
            },
            opt.excludeNodeModulesCompress,
        );
        await globDo(
            trimPath(join(opt.outDir, "**/*.json")),
            async (file) => {
                const min = await readFile(file, { encoding: "utf-8" });
                await writeFile(file, JSON.stringify(JSONparse(min)));
            },
            opt.excludeNodeModulesCompress,
        );
        await globDo(
            trimPath(
                join(
                    opt.outDir,
                    "**/!(*.js|*.json|*.mjs|*.cjs|*.node|*.dll|*.so.*|*.dylib|*.exe|*.bin|*.wasm|*.wasm.map|*.wasm.gz)",
                ),
            ),
            async (file) => {
                await rm(file);
            },
            opt.excludeNodeModulesCompress,
        );
    }
    if (opt.removeEmptyDirs !== false) {
        await removeEmptyDirs(opt.outDir);
    }
}

async function findEmptyDirs(dir: string): Promise<[string[], boolean]> {
    const emptyDirs: string[] = [];
    let selfEmpty = true;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            const [subEmptyDirs, subEmpty] = await findEmptyDirs(
                join(dir, entry.name),
            );
            if (!subEmpty) {
                emptyDirs.push(...subEmptyDirs);
                selfEmpty = false;
            } else {
                emptyDirs.push(join(dir, entry.name));
            }
        } else {
            selfEmpty = false;
        }
    }
    if (selfEmpty && emptyDirs.length === 0) {
        emptyDirs.push(dir);
    }
    return [emptyDirs, selfEmpty];
}

async function removeEmptyDirs(dir: string) {
    if (dir.startsWith("/")) {
        throw new Error("Cannot remove empty dirs from root");
    }
    const emptyDirs = await findEmptyDirs(resolve(dir));
    console.log(`Removing ${emptyDirs[0].length} empty dirs`);
    await Promise.all(emptyDirs[0].map((d) => rm(d, { recursive: true })));
}
