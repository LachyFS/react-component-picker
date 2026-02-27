import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: !isWatch,
  sourcemap: false,
};

const configs = [
  {
    ...sharedOptions,
    entryPoints: ["src/content/index.ts"],
    outfile: "dist/content.js",
  },
  {
    ...sharedOptions,
    entryPoints: ["src/content/page-script.ts"],
    outfile: "dist/page-script.js",
  },
  {
    ...sharedOptions,
    entryPoints: ["src/background/service-worker.ts"],
    outfile: "dist/service-worker.js",
  },
  {
    ...sharedOptions,
    entryPoints: ["src/popup/popup.ts"],
    outfile: "dist/popup.js",
  },
];

async function build() {
  if (isWatch) {
    const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("Watching for changes...");
  } else {
    await Promise.all(configs.map((c) => esbuild.build(c)));
    console.log("Build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
