import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({
    invalidateSize: vi.fn(),
    fitBounds: vi.fn(),
    getContainer: () => document.createElement("div"),
    setView: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
  }),
}));

vi.mock("leaflet", () => {
  const icon = vi.fn((opts: { iconUrl?: string }) => ({
    options: { iconUrl: opts?.iconUrl ?? "marker.png" },
  }));
  class Control {
    options: unknown;
    onAdd?: () => HTMLElement;
    constructor(options?: unknown) {
      this.options = options;
    }
    addTo() {
      return this;
    }
    remove() {
      return this;
    }
  }
  return {
    default: {
      icon,
      divIcon: vi.fn(() => ({ options: {} })),
      latLngBounds: vi.fn(() => ({ extend: vi.fn(), isValid: () => true })),
      Icon: { Default: { mergeOptions: vi.fn() } },
      Control,
      DomUtil: {
        create: (_tag: string, _cls?: string, parent?: HTMLElement) => {
          const el = document.createElement(_tag === "a" ? "a" : "div");
          parent?.appendChild(el);
          return el;
        },
      },
      DomEvent: {
        disableClickPropagation: vi.fn(),
        disableScrollPropagation: vi.fn(),
        on: vi.fn(),
        preventDefault: vi.fn(),
      },
    },
  };
});

vi.mock("leaflet-defaulticon-compatibility", () => ({}));

vi.mock("../../utils/gdpr/cookieConsent", () => ({
  getPreferenceCookie: () => null,
  setPreferenceCookie: vi.fn(),
}));

vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));

vi.mock("../../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  getApiOpenVpnClientsOverviewPoints: vi.fn(async () => ({ points: [] })),
}));

import { GeoPointsMap } from "./GeoPointsMap";

describe("GeoPointsMap", () => {
  it("renders map chrome with layer and point-style controls", async () => {
    render(
      <GeoPointsMap
        from={new Date("2024-01-01T00:00:00Z")}
        to={new Date("2024-01-08T00:00:00Z")}
        vpnServerId={1}
      />,
    );

    expect(await screen.findByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByText(/Point style:/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Carto Dark")).toBeInTheDocument();
  });
});
