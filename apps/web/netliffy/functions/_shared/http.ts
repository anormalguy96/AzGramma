import type { HandlerResponse } from "@netlify/functions";

export function json(statusCode: number, body: unknown): HandlerResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown): HandlerResponse {
  return json(200, body);
}

export function bad(statusCode: number, message: string, details?: unknown): HandlerResponse {
  return json(statusCode, { error: message, details });
}
