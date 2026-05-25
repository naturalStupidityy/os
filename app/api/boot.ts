import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

// CORS - allow all origins in development for phone/laptop same-network access
app.use("*", cors({
  origin: (origin) => {
    if (!env.isProduction) return origin || "*";
    return origin || "*";
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check
app.get("/health", (c) => c.json({
  status: "ok",
  timestamp: new Date().toISOString(),
  version: "1.0.0",
  env: env.isProduction ? "production" : "development",
}));

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = env.port;
  const host = env.host;
  serve({ fetch: app.fetch, port, hostname: host }, () => {
    console.log(`VKumbh Server running on http://${host}:${port}/`);
  });
}
