import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePostApiAuthGoogleLogin } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { GoogleLoginRequest, LoginResponse } from "../../api/orvalModelShim";
import { getRuntimeEnv } from "../../utils/runtimeEnv";
import axios from "axios";
import { errorMessage } from "../../utils/errorMessage";
import { setStoredProfileAvatarFromGoogleIdToken } from "../../utils/auth/storedProfileAvatar";
import {
  applyLoginFlow,
  type TotpChallengeState,
} from "../../utils/auth/handleLoginResponse";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-script";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_BUTTON_MIN_WIDTH = 200;

function resolveGoogleButtonWidth(container: HTMLElement): number {
    const measured = Math.floor(container.getBoundingClientRect().width);
    return Math.max(GOOGLE_BUTTON_MIN_WIDTH, measured);
}

interface GoogleLoginFormProps {
  redirectPath?: string;
  onTotpChallenge: (challenge: TotpChallengeState) => void;
}

const GoogleLoginForm: React.FC<GoogleLoginFormProps> = ({
  redirectPath = "/",
  onTotpChallenge,
}) => {
    const [error, setError] = useState<string>("");
    const [scriptReady, setScriptReady] = useState<boolean>(false);
    const buttonContainerRef = useRef<HTMLDivElement>(null);

    const { mutateAsync: googleLogin, isPending } = usePostApiAuthGoogleLogin();

    const handleGoogleCredential = useCallback(
        async (idToken: string) => {
            setError("");

            try {
                const body: GoogleLoginRequest = {
                    idToken,
                };

                const response = orvalPayload<LoginResponse>(
                  await googleLogin({
                    data: body,
                  }),
                );

                applyLoginFlow(response, {
                    redirectPath,
                    clearAvatar: false,
                    onTotpChallenge: (challenge) => {
                      onTotpChallenge({
                        ...challenge,
                        onBeforeStoreTokens: () => setStoredProfileAvatarFromGoogleIdToken(idToken),
                      });
                    },
                    onBeforeStoreTokens: () => setStoredProfileAvatarFromGoogleIdToken(idToken),
                });
            } catch (err: unknown) {
                let detailedMessage =
                    "We could not log you in with Google. Please try again.";

                if (axios.isAxiosError(err)) {
                    if (err.response) {
                        detailedMessage += ` Server responded with status ${err.response.status} (${err.response.statusText}).`;
                        const d = err.response.data;
                        if (d && typeof d === "object" && d !== null && "error" in d) {
                            detailedMessage += ` Details: ${String((d as { error: unknown }).error)}`;
                        }
                    } else if (err.request) {
                        detailedMessage += " The server did not respond.";
                    } else if (err.message) {
                        detailedMessage += ` Error: ${err.message}`;
                    }
                } else {
                    detailedMessage += ` Error: ${errorMessage(err)}`;
                }

                setError(detailedMessage);
            }
        },
        [googleLogin, onTotpChallenge, redirectPath],
    );

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

    const renderGoogleButton = useCallback(() => {
        const buttonContainer = buttonContainerRef.current;
        if (!buttonContainer || !window.google?.accounts?.id) {
            return;
        }

        buttonContainer.replaceChildren();
        window.google.accounts.id.renderButton(buttonContainer, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width: resolveGoogleButtonWidth(buttonContainer),
        });
    }, []);

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
                    callback: (response: GoogleCredentialResponse) => {
                        if (response?.credential) {
                            void handleGoogleCredential(response.credential);
                        } else {
                            setError("Google did not return a valid credential.");
                        }
                    },
                });

                renderGoogleButton();
                setScriptReady(true);
            } catch (e: unknown) {
                if (cancelled) {
                    return;
                }

                setError(
                    e instanceof Error
                        ? e.message
                        : errorMessage(e) ||
                          "Failed to initialize Google Identity Services. Please try again later.",
                );
                setScriptReady(false);
            }
        };

        void initGoogle();

        return () => {
            cancelled = true;
        };
    }, [handleGoogleCredential, renderGoogleButton]);

    useEffect(() => {
        const buttonContainer = buttonContainerRef.current;
        if (!buttonContainer || !scriptReady) {
            return;
        }

        const observer = new ResizeObserver(() => {
            renderGoogleButton();
        });
        observer.observe(buttonContainer);

        return () => {
            observer.disconnect();
        };
    }, [scriptReady, renderGoogleButton]);

    return (
        <>
            {error && <p className="error-message">{error}</p>}

            <div className="login-item">
                <div ref={buttonContainerRef} className="google-login-wrapper" />
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
