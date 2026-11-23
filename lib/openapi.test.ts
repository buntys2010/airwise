import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { must } from "../test-support/must";

const root = path.resolve(import.meta.dirname, "..");
const spec = readFileSync(path.join(root, "docs/openapi.yaml"), "utf8");
const apiDir = path.join(root, "app/api");
const routeFile = (dir: string) =>
  readdirSync(path.join(apiDir, dir)).find((f) => /^route\.tsx?$/.test(f));

/** Routes that exist on disk: each folder under app/api holding a route file. */
const routes = readdirSync(apiDir).filter(
  (d) => statSync(path.join(apiDir, d)).isDirectory() && routeFile(d),
);

describe("docs/openapi.yaml", () => {
  it("documents every API route, and only routes that exist", () => {
    const documented = [...spec.matchAll(/^ {2}\/([a-z-]+):$/gm)].map((m) => m[1]).sort();
    expect(documented).toEqual([...routes].sort());
  });

  it("documents the method each route exports", () => {
    for (const r of routes) {
      const src = readFileSync(path.join(apiDir, r, must(routeFile(r))), "utf8");
      const method = /export const (GET|POST) /.exec(src)?.[1]?.toLowerCase();
      expect(method, `${r} exports a handler`).toBeTruthy();
      const block =
        spec.split(new RegExp(`^ {2}/${r}:$`, "m"))[1]?.split(/^ {2}\/[a-z-]+:$/m)[0] ?? "";
      expect(block, `${r} documents ${method}`).toMatch(new RegExp(`^ {4}${method}:$`, "m"));
    }
  });

  it("documents every status code the routes return", () => {
    for (const code of ["400", "413", "415", "429", "500"]) expect(spec).toContain(`"${code}"`);
  });

  it("references only schemas, responses and headers that are defined", () => {
    const refs = [...spec.matchAll(/#\/components\/(schemas|responses|headers)\/(\w+)/g)];
    expect(refs.length).toBeGreaterThan(10);
    for (const [, kind, name] of refs)
      expect(spec, `${kind}/${name} is defined`).toMatch(new RegExp(`^ {4}${name}:$`, "m"));
  });
});
