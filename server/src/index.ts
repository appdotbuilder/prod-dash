import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createKpiDataInputSchema, 
  createStaffMemberInputSchema, 
  updateStaffMemberInputSchema,
  csvUploadInputSchema,
  dateRangeQuerySchema 
} from './schema';

// Import handlers
import { createKpiData } from './handlers/create_kpi_data';
import { getKpiData } from './handlers/get_kpi_data';
import { createStaffMember } from './handlers/create_staff_member';
import { getStaffMembers } from './handlers/get_staff_members';
import { updateStaffMember } from './handlers/update_staff_member';
import { deleteStaffMember } from './handlers/delete_staff_member';
import { uploadCsv } from './handlers/upload_csv';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // KPI data endpoints
  createKpiData: publicProcedure
    .input(createKpiDataInputSchema)
    .mutation(({ input }) => createKpiData(input)),
  
  getKpiData: publicProcedure
    .input(dateRangeQuerySchema.optional())
    .query(({ input }) => getKpiData(input)),

  // Staff management endpoints
  createStaffMember: publicProcedure
    .input(createStaffMemberInputSchema)
    .mutation(({ input }) => createStaffMember(input)),
  
  getStaffMembers: publicProcedure
    .query(() => getStaffMembers()),
  
  updateStaffMember: publicProcedure
    .input(updateStaffMemberInputSchema)
    .mutation(({ input }) => updateStaffMember(input)),
  
  deleteStaffMember: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteStaffMember(input.id)),

  // CSV upload endpoint
  uploadCsv: publicProcedure
    .input(csvUploadInputSchema)
    .mutation(({ input }) => uploadCsv(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Production Dashboard TRPC server listening at port: ${port}`);
}

start();