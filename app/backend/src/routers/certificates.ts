import { z } from 'zod';
import { router, publicProcedure, authedProcedure } from '../trpc';

export const certificatesRouter = router({
  getMyCertificates: authedProcedure.query(async ({ ctx }) => {
    const userId = (ctx as any).user?.id || 'demo-user';

    return [
      {
        id: 'cert-001',
        userId,
        eventId: 'event-001',
        certificateNumber: 'VK-2025-CERT-0001',
        templateId: 'default',
        status: 'issued',
        issuedAt: new Date('2025-01-20'),
        downloadUrl: '/api/certificates/cert-001/download',
        metadata: {
          eventName: 'Kumbh Mela 2025',
          issueDate: '2025-01-20',
          validUntil: '2026-01-20',
        },
      },
    ];
  }),

  download: publicProcedure
    .input(z.object({ certificateId: z.string() }))
    .query(async ({ input }) => {
      return {
        downloadUrl: '#',
        certificateId: input.certificateId,
        message: 'Certificate download (Demo: No actual file)',
      };
    }),

  generate: authedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.id || 'demo-user';

      return {
        id: 'cert-' + Math.random().toString(36).slice(2, 8),
        userId,
        eventId: input.eventId,
        certificateNumber: `VK-2025-CERT-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        status: 'generated',
        generatedAt: new Date(),
      };
    }),
});
