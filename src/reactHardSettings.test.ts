import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("React / TypeScript hard settings", () => {
  it("keeps StrictMode wrapping the app root (removed Dec 2025; must stay on)", () => {
    const src = readFileSync(join(root, "src/main.tsx"), "utf8");
    expect(src).toMatch(/import\s*\{\s*StrictMode\s*\}\s*from\s*["']react["']/);
    expect(src).toMatch(/<StrictMode>/);
    expect(src).toMatch(/<\/StrictMode>/);
  });

  it("keeps TypeScript strict lint flags enabled in tsconfig.app.json", () => {
    // tsconfig allows comments — assert on source text, not JSON.parse.
    const src = readFileSync(join(root, "tsconfig.app.json"), "utf8");
    for (const flag of [
      '"strict": true',
      '"noImplicitOverride": true',
      '"noFallthroughCasesInSwitch": true',
      '"forceConsistentCasingInFileNames": true',
      '"noUnusedLocals": true',
      '"noUnusedParameters": true',
      '"erasableSyntaxOnly": true',
      '"noUncheckedSideEffectImports": true',
    ]) {
      expect(src, `missing ${flag}`).toContain(flag);
    }
  });
});
