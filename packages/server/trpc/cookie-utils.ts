import cookie from "cookie";
import type { CookieSerializeOptions } from "cookie";
import * as express from "express";

export function getCookies(req: express.Request) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  return cookie.parse(cookieHeader);
}

export function getCookie(req: express.Request, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return;
  const cookies = cookie.parse(cookieHeader);
  return cookies[name];
}

export function setCookie(
  res: express.Response,
  name: string,
  value: string,
  options?: CookieSerializeOptions,
) {
  res.appendHeader("Set-Cookie", cookie.serialize(name, value, options));
}
