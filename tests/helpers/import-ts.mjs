import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

export async function importTs(modulePath) {
  const abs = path.resolve(modulePath);
  const source = await fs.readFile(abs, "utf8");
  let code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: abs,
  }).outputText;

  const base = path.dirname(abs);
  code = code.replace(/from\s+["'](\.[^"']+)["']/g, (_match, rel) => {
    const resolved = path.resolve(base, rel);
    return `from "${pathToFileURL(resolved).href}"`;
  });

  const hash = createHash("sha256").update(abs).update(source).digest("hex").slice(0, 12);
  const out = path.join(tmpdir(), `ottoserv-test-${hash}.mjs`);
  await fs.writeFile(out, code, "utf8");
  return import(pathToFileURL(out).href);
}
