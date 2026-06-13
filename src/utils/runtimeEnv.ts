type EnvWindow = Window & {
    __ENV__?: Record<string, unknown>;
};

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function getRuntimeEnv() {
    const w = window as EnvWindow;

    const runtime = (w.__ENV__ ?? {}) as Record<string, unknown>;
    const buildGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const buildBackendUrl = import.meta.env.VITE_BACKEND_URL;

    return {
        googleClientId: readString(runtime["VITE_GOOGLE_CLIENT_ID"]) || readString(buildGoogleClientId),
        backendUrl: readString(runtime["BACKEND_URL"]) || readString(buildBackendUrl),
    };
}
