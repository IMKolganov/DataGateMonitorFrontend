import { describe, expect, it } from "vitest";
import { withCartoApiKey } from "./cartoBasemapUrl";

const cartoUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

describe("withCartoApiKey", () => {
    it("leaves the URL unchanged without a key", () => {
        expect(withCartoApiKey(cartoUrl)).toBe(cartoUrl);
        expect(withCartoApiKey(cartoUrl, "  ")).toBe(cartoUrl);
    });

    it("appends key= to CARTO tile URLs", () => {
        expect(withCartoApiKey(cartoUrl, " abc ")).toBe(`${cartoUrl}?key=abc`);
    });

    it("does not attach a key to non-CARTO layers", () => {
        expect(withCartoApiKey(osmUrl, "abc")).toBe(osmUrl);
    });
});
