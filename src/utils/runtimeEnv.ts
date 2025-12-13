type EnvWindow = Window & {
    __ENV__?: Record<string, unknown>;
};

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function getRuntimeEnv() {
    const w = window as EnvWindow;

    const runtime = (w.__ENV__ ?? {}) as Record<string, unknown>;
    const build = ((import.meta as any).env ?? {}) as Record<string, unknown>;

    return {
        googleClientId: readString(runtime["VITE_GOOGLE_CLIENT_ID"]) || readString(build["VITE_GOOGLE_CLIENT_ID"]),
        backendUrl: readString(runtime["BACKEND_URL"]) || readString(build["BACKEND_URL"]) || readString(build["VITE_BACKEND_URL"]),
    };
}
