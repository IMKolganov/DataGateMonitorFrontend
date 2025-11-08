import { jwtDecode } from "jwt-decode";
import { logout } from "../api/apirequest";

export function scheduleAutoLogout(token: string) {
  try {
    const decoded: any = jwtDecode(token);
    const exp = decoded.exp * 1000;
    const now = Date.now();
    const timeout = exp - now;

    if (timeout > 0) {
      setTimeout(() => {
        logout();
      }, timeout);
    } else {
      logout(); // token expired
    }
  } catch {
    logout(); // token invalid
  }
}
