import type { UserDto } from "../../api/orvalModelShim";

export function formatAccessUserLabel(
  user: Pick<UserDto, "id" | "displayName" | "email"> | null | undefined,
): string {
  if (user == null) return "—";
  const name = user.displayName?.trim();
  const email = user.email?.trim();
  if (name && email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  return user.id != null ? `User #${user.id}` : "—";
}

export function formatAccessUserFallback(userId: number | null | undefined): string {
  return userId != null ? `User #${userId}` : "—";
}
