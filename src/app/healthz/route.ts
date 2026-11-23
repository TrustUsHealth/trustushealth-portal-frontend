export function GET(): Response {
  return Response.json(
    { status: "ok", service: "frontend" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
