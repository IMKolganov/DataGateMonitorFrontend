import { describe, expect, it } from "vitest";
import { parseIvGuiVer } from "./parseIvGuiVer";

describe("parseIvGuiVer", () => {
  it("parses DataGate Android pattern", () => {
    const parsed = parseIvGuiVer("3.12_datagate_android_1.0.7");
    expect(parsed.clientLabel).toBe("DataGate Android");
    expect(parsed.appVersion).toBe("1.0.7");
    expect(parsed.openVpnCore).toBe("3.12");
  });

  it("parses stock OpenVPN Android client", () => {
    const parsed = parseIvGuiVer("net.openvpn.connect.android_3.7.1-10568");
    expect(parsed.clientLabel).toBe("OpenVPN Connect (Android)");
    expect(parsed.appVersion).toBe("3.7.1-10568");
  });
});
