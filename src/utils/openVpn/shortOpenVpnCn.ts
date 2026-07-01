export function shortOpenVpnCn(cn: string): string {
  if (cn.length <= 36) return cn;
  return `${cn.slice(0, 18)}…${cn.slice(-14)}`;
}
