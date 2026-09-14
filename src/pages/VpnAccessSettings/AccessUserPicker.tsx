import type { UserDto } from "../../api/orvalModelShim";
import { UserAvatar } from "../../components/ui/UserAvatar.tsx";
import { readOptionalAvatarUrl } from "../../utils/readOptionalAvatarUrl.ts";
import { telegramPhotoIdForProvider } from "../../utils/telegramNumericId.ts";
import { formatAccessUserLabel } from "./accessUserLabel";
import "../../css/Settings.css";

type Props = {
  users: UserDto[];
  selectedIds: ReadonlySet<number>;
  search: string;
  onSearchChange: (value: string) => void;
  onChangeSelectedIds: (next: Set<number>) => void;
  disabled?: boolean;
};

function visibleUserIds(users: UserDto[]): number[] {
  return users.map((user) => user.id).filter((id): id is number => id != null);
}

export function AccessUserPicker({
  users,
  selectedIds,
  search,
  onSearchChange,
  onChangeSelectedIds,
  disabled = false,
}: Props) {
  const visibleIds = visibleUserIds(users);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangeSelectedIds(next);
  };

  const toggleVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      for (const id of visibleIds) next.delete(id);
    } else {
      for (const id of visibleIds) next.add(id);
    }
    onChangeSelectedIds(next);
  };

  return (
    <div className="vpn-access-picker">
      <input
        id="vpn-access-user-search"
        name="vpnAccessUserSearch"
        type="search"
        className="input vpn-access-picker__search"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={disabled}
        aria-label="Search users"
      />

      <div className="vpn-access-picker__status">
        <span>
          {selectedIds.size === 0
            ? "No people selected"
            : `${selectedIds.size} selected`}
        </span>
        {selectedIds.size > 0 && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => onChangeSelectedIds(new Set())}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      <fieldset className="vpn-access-picker__fieldset" disabled={disabled} aria-label="People to add">
        {users.length === 0 ? (
          <p className="text-muted vpn-access-picker__empty">
            {search.trim()
              ? "No matching users."
              : "Everyone already has a personal rule on this server."}
          </p>
        ) : (
          <ul className="vpn-access-picker__list">
            <li className="vpn-access-picker__row vpn-access-picker__row--all">
              <label className="vpn-access-picker__label">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                  }}
                  onChange={toggleVisible}
                  aria-label="Select all visible users"
                />
                <span>Select all visible ({visibleIds.length})</span>
              </label>
            </li>
            {users.map((user) => {
              if (user.id == null) return null;
              const label = formatAccessUserLabel(user);
              const title = user.displayName?.trim() || user.email?.trim() || `User #${user.id}`;
              return (
                <li key={user.id} className="vpn-access-picker__row">
                  <label className="vpn-access-picker__label">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleOne(user.id as number)}
                      aria-label={label}
                    />
                    <UserAvatar
                      src={readOptionalAvatarUrl(user)}
                      telegramPhotoTelegramId={telegramPhotoIdForProvider(
                        user.provider,
                        user.externalId,
                      )}
                      name={title}
                      colorSeed={`${user.id}|${user.email ?? ""}`}
                      size={28}
                    />
                    <span className="vpn-access-picker__meta">
                      <strong>{title}</strong>
                      {user.email?.trim() && user.email.trim() !== title ? (
                        <span>{user.email}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
