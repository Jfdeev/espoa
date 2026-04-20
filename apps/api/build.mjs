import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

// All npm dependencies stay as external requires in the bundle.
// @espoa/database (workspace) gets inlined into the output.
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
].filter((name) => !name.startsWith("@espoa/"));

await esbuild.build({
  entryPoints: ["src/app.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  outfile: "dist/app.js",
  external,
});
