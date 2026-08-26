import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="vpn-map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({
    stop: vi.fn(),
    getContainer: () => ({ isConnected: true }),
  }),
}));

vi.mock("leaflet", () => {
  const icon = vi.fn((opts: { iconUrl?: string }) => ({
    options: { iconUrl: opts?.iconUrl ?? "marker.png" },
  }));
  return {
    default: {
      icon,
      divIcon: vi.fn(() => ({ options: {} })),
      Icon: { Default: { mergeOptions: vi.fn() } },
    },
  };
});
vi.mock("leaflet-defaulticon-compatibility", () => ({}));
vi.mock("react-globe.gl", () => ({ default: () => <div data-testid="globe" /> }));

vi.mock("./VpnGlobeBoundary", () => ({
  isWebGLAvailable: () => false,
  VpnGlobeBoundary: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../utils/gdpr/cookieConsent", () => ({
  getPreferenceCookie: () => null,
  setPreferenceCookie: vi.fn(),
}));

import VpnMap from "./VpnMap";

describe("VpnMap", () => {
  it("renders map view controls for empty clients", () => {
    render(
      <VpnMap
        clients={[]}
        serverLocation={[50, 30]}
        serverName="Edge"
      />,
    );

    expect(screen.getByDisplayValue("Map")).toBeInTheDocument();
    expect(screen.getByTestId("vpn-map-container")).toBeInTheDocument();
  });
});
