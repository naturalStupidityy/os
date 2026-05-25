import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyToken } from "./lib/auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: { id: string; role: string; name: string } | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const authHeader = opts.req.headers.get("authorization");
  let user = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    user = await verifyToken(token);
  }

  return { req: opts.req, resHeaders: opts.resHeaders, user };
}
