import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./CertificatesTable.tsx", () => ({ default: () => <div data-testid="certs-table" /> }));
vi.mock("./AddCertificate.tsx", () => ({ default: () => null }));
vi.mock("./OpenVpnIssuedFilesSection.tsx", () => ({
  default: () => <div data-testid="ovpn-files" />,
}));
vi.mock("./XrayClientLinksSection.tsx", () => ({
  default: () => <div data-testid="xray-links" />,
}));
vi.mock("../certExpiry/CertExpiryCheckPanel.tsx", () => ({
  default: () => <div data-testid="cert-expiry" />,
  CertExpiryCheckPanel: () => <div data-testid="cert-expiry" />,
}));

vi.mock("../../api/orval/vpn-server-certs/vpn-server-certs.ts", () => ({
  useGetApiOpenVpnCertsVpnServerIdGetAll: () => ({
    data: { certificates: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import CertificatesData from "./CertificatesData";

describe("CertificatesData", () => {
  it("renders OpenVPN certificates chrome", () => {
    renderWithProviders(<CertificatesData vpnServerId="8" stack="openvpn" />);
    expect(screen.getByText("Certificates")).toBeInTheDocument();
    expect(screen.getByTestId("certs-table")).toBeInTheDocument();
    expect(screen.getByTestId("ovpn-files")).toBeInTheDocument();
  });

  it("renders Xray client links chrome", () => {
    renderWithProviders(<CertificatesData vpnServerId="8" stack="xray" />);
    expect(screen.getByText("Xray user certificates")).toBeInTheDocument();
    expect(screen.getByTestId("xray-links")).toBeInTheDocument();
  });
});
