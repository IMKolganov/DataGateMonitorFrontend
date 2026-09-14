/** Append a CARTO raster-basemap key when the tile URL is a cartocdn endpoint. */
export function withCartoApiKey(url: string, key?: string): string {
    const trimmed = key?.trim() ?? "";
    if (!trimmed) return url;
    if (!url.includes("basemaps.cartocdn.com")) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}key=${encodeURIComponent(trimmed)}`;
}
