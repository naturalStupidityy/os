import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";

export const syncRouter = createRouter({
  batchSync: authedQuery
    .input(z.object({
      items: z.array(z.any()),
    }))
    .mutation(async ({ input }) => {
      return {
        results: input.items.map((item: any) => ({
          id: item.id,
          success: true,
        })),
      };
    }),
});
