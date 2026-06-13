import { jwtDecode } from "jwt-decode";
import { USER_PROFILE_AVATAR_URL_KEY } from "../const.ts";

type GoogleCredentialPayload = {
  picture?: string;
};

export function setStoredProfileAvatarFromGoogleIdToken(idToken: string): void {
  try {
    const d = jwtDecode<GoogleCredentialPayload>(idToken);
    const pic = d.picture;
    if (typeof pic === "string" && pic.startsWith("http")) {
      localStorage.setItem(USER_PROFILE_AVATAR_URL_KEY, pic);
    } else {
      localStorage.removeItem(USER_PROFILE_AVATAR_URL_KEY);
    }
  } catch {
    localStorage.removeItem(USER_PROFILE_AVATAR_URL_KEY);
  }
}

export function getStoredProfileAvatarUrl(): string | undefined {
  const v = localStorage.getItem(USER_PROFILE_AVATAR_URL_KEY);
  return v && v.startsWith("http") ? v : undefined;
}

export function clearStoredProfileAvatarUrl(): void {
  localStorage.removeItem(USER_PROFILE_AVATAR_URL_KEY);
}
