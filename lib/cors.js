export const PUBLIC_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function corsPreflightResponse() {
  return new Response(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
}