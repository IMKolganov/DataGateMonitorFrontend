import React, { useEffect, useState } from "react";
import { usePostApiAuthGoogleLogin } from "../../api/orval/auth/auth";
import type {
    GoogleLoginRequest,
    GoogleLoginResponse,
} from "../../api/orval/model";
import { scheduleAutoLogout } from "../../utils/auth/authSession";
import { getRuntimeEnv } from "../../utils/runtimeEnv";
import {ACCESS_TOKEN_KEY, REFRESH_TOKEN_EXPIRATION, REFRESH_TOKEN_KEY} from "../../utils/const.ts";

declare global {
    interface Window {
        google?: any;
    }
}

const GOOGLE_SCRIPT_ID = "google-identity-script";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const GoogleLoginForm: React.FC = () => {
    const [error, setError] = useState<string>("");
    const [scriptReady, setScriptReady] = useState<boolean>(false);

    const { mutateAsync: googleLogin, isPending } = usePostApiAuthGoogleLogin();

    const handleGoogleCredential = async (idToken: string) => {
        setError("");

        try {
            const body: GoogleLoginRequest = {
                idToken,
            };

            const response = (await googleLogin({
                data: body,
            })) as GoogleLoginResponse;

            const token = response.token;
            const refreshToken = response.refreshToken;
            const refreshExpiration = response.refreshExpiration;

            if (!token) {
                throw new Error("No token returned by API.");
            }

            localStorage.setItem(ACCESS_TOKEN_KEY, token);
            if (refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            }
            if (refreshExpiration) {
                localStorage.setItem(REFRESH_TOKEN_EXPIRATION, refreshExpiration);
            }
            scheduleAutoLogout(token);
            window.location.href = "/";
        } catch (err: any) {
            let detailedMessage =
                "We could not log you in with Google. Please try again.";

            if (err?.response) {
                detailedMessage += ` Server responded with status ${err.response.status} (${err.response.statusText}).`;
                if (err.response.data?.error) {
                    detailedMessage += ` Details: ${err.response.data.error}`;
                }
            } else if (err?.request) {
                detailedMessage += " The server did not respond.";
            } else if (err?.message) {
                detailedMessage += ` Error: ${err.message}`;
            }

            setError(detailedMessage);
        }
    };

    const loadGoogleScript = () =>
        new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as
                | HTMLScriptElement
                | null;

            if (existingScript) {
                if (window.google && window.google.accounts?.id) {
                    resolve();
                } else {
                    existingScript.addEventListener("load", () => resolve(), {
                        once: true,
                    });
                    existingScript.addEventListener(
                        "error",
                        () => reject(new Error("Failed to load Google Identity script.")),
                        { once: true },
                    );
                }
                return;
            }

            const script = document.createElement("script");
            script.id = GOOGLE_SCRIPT_ID;
            script.src = GOOGLE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                resolve();
            };

            script.onerror = () => {
                reject(new Error("Failed to load Google Identity script."));
            };

            document.body.appendChild(script);
        });

    useEffect(() => {
        let cancelled = false;

        const initGoogle = async () => {
            setScriptReady(false);

            const { googleClientId } = getRuntimeEnv();
            if (!googleClientId) {
                setError("Google client ID is not configured (VITE_GOOGLE_CLIENT_ID).");
                return;
            }

            try {
                await loadGoogleScript();

                if (cancelled) {
                    return;
                }

                if (!window.google || !window.google.accounts?.id) {
                    throw new Error("Google Identity API is not available on window.");
                }

                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: (response: any) => {
                        if (response && response.credential) {
                            void handleGoogleCredential(response.credential);
                        } else {
                            setError("Google did not return a valid credential.");
                        }
                    },
                });

                const buttonContainer = document.getElementById(
                    "google-signin-button",
                );

                if (!buttonContainer) {
                    throw new Error("Google sign-in button container was not found.");
                }

                window.google.accounts.id.renderButton(buttonContainer, {
                    type: "standard",
                    theme: "filled_black",
                    size: "large",
                    text: "signin_with",
                    shape: "rectangular",
                });

                // Optional auto prompt; remove if not needed
                // window.google.accounts.id.prompt();

                setScriptReady(true);
            } catch (e: any) {
                if (cancelled) {
                    return;
                }

                setError(
                    e?.message ??
                    "Failed to initialize Google Identity Services. Please try again later.",
                );
                setScriptReady(false);
            }
        };

        void initGoogle();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <>
            {error && <p className="error-message">{error}</p>}

            <div className="login-item">
                <div id="google-signin-button" className="google-login-wrapper" />
            </div>

            {(!scriptReady || isPending) && (
                <div className="login-item">
                    <span>Loading...</span>
                </div>
            )}
        </>
    );
};

export default GoogleLoginForm;
