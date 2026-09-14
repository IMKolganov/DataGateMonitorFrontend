import { ServerQuotaPlansPanel } from "./ServerQuotaPlansPanel";
import { VpnServerAccessPanel } from "./VpnServerAccessPanel";

type Props = {
  vpnServerId: number;
};

/** Quota-plan allowlist plus personal grants/blocks for one server. */
export function ServerAccessBody({ vpnServerId }: Props) {
  return (
    <>
      <ServerQuotaPlansPanel vpnServerId={vpnServerId} />
      <VpnServerAccessPanel vpnServerId={vpnServerId} title="Personal access" />
    </>
  );
}
