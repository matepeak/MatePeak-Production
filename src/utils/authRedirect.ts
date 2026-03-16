import { env } from "@/config/env";

export function getAuthRedirectUrl(path: string = "/") {
  const baseUrl = (env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
