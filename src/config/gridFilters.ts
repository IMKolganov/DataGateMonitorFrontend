import type { GridFilterField } from "../components/ui/GridFilterBar";

/**
 * Catalog of server-side grid filters (backend DTO query params).
 * After publishing SharedModels 1.0.39+ and running `npm run gen:api`, wire each hook
 * to pass `param` values into the generated Orval hooks.
 */
export const GRID_FILTER_DEFINITIONS = {
  "settings-users": [
    { id: "search", label: "Search", placeholder: "Name or email", param: "Search" },
    { id: "externalId", label: "External ID", param: "ExternalId" },
    { id: "provider", label: "Provider", param: "Provider" },
    {
      id: "isAdmin",
      label: "Admin",
      param: "IsAdmin",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      id: "isBlocked",
      label: "Blocked",
      param: "IsBlocked",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ] satisfies GridFilterField[],

  "server-connected-clients": [
    { id: "search", label: "Search", placeholder: "CN, external id, IP", param: "Search" },
    { id: "commonName", label: "Common name", param: "CommonName" },
    { id: "externalId", label: "External ID", param: "ExternalId" },
  ] satisfies GridFilterField[],

  "server-history-clients": [
    { id: "search", label: "Search", placeholder: "CN, external id, IP", param: "Search" },
    { id: "commonName", label: "Common name", param: "CommonName" },
    { id: "externalId", label: "External ID", param: "ExternalId" },
  ] satisfies GridFilterField[],

  "server-events": [
    { id: "commonName", label: "Common name", param: "CommonName" },
    { id: "externalId", label: "External ID", param: "ExternalId" },
    { id: "eventType", label: "Event type", param: "EventType" },
  ] satisfies GridFilterField[],

  "settings-applications": [
    { id: "name", label: "Name", param: "Name" },
    { id: "clientId", label: "Client ID", param: "ClientId" },
    {
      id: "isRevoked",
      label: "Revoked",
      param: "IsRevoked",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ] satisfies GridFilterField[],

  "settings-telegram-bot-users": [
    { id: "search", label: "Search", placeholder: "Username or name", param: "Search" },
    { id: "telegramId", label: "Telegram ID", param: "TelegramId", type: "number" },
    { id: "username", label: "Username", param: "Username" },
  ] satisfies GridFilterField[],

  "settings-telegram-bot-messages": [
    { id: "search", label: "Search", placeholder: "Message text", param: "Search" },
    { id: "telegramId", label: "Telegram ID", param: "TelegramId", type: "number" },
    { id: "username", label: "Username", param: "Username" },
  ] satisfies GridFilterField[],

  "overview-users": [
    { id: "externalId", label: "External ID", param: "ExternalId" },
    { id: "displayName", label: "Display name", param: "DisplayName" },
  ] satisfies GridFilterField[],

  "quota-plans": [
    { id: "name", label: "Name", placeholder: "Plan name (client-side until API)" },
  ] satisfies GridFilterField[],

  "ovpn-config-conflog": [
    { id: "requestUrl", label: "Request URL", param: "RequestUrl" },
  ] satisfies GridFilterField[],

  "user-telegram-messages": [
    { id: "search", label: "Search", placeholder: "Message text (client-side stub)" },
  ] satisfies GridFilterField[],

  /** Already has client-side CN / issuedTo inputs — optional server-side later */
  "ovpn-files": [] satisfies GridFilterField[],

  /** Already has client-side CN / issuedTo inputs */
  "xray-client-links": [] satisfies GridFilterField[],

  /** Already has client-side CN / status / serial filters */
  "certificates": [] satisfies GridFilterField[],

  /** Parent NotificationsSection already wires IsRead, Type, Severities */
  "notifications": [] satisfies GridFilterField[],
} as const satisfies Record<string, GridFilterField[]>;

export type GridFilterId = keyof typeof GRID_FILTER_DEFINITIONS;

export function gridFilterFields(gridId: GridFilterId): GridFilterField[] {
  return [...GRID_FILTER_DEFINITIONS[gridId]];
}
