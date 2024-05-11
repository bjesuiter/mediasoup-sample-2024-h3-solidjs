import { mediasoupServerPromise } from "../mediasoup/mediasoupServer";
import { publicProcedure, router } from "./trpc.base";

export const trpcRouter = router({
  // e.g. /ping
  ping: publicProcedure.query(() => "pong"),

  // e.g. /getServerRtpCapabilities
  getServerRtpCapabilities: publicProcedure.query(async () => {
    const { router } = await mediasoupServerPromise;
    return router.rtpCapabilities;
  }),
});

// Export type router type signature,
// NOT the router itself.
export type TrpcRouter = typeof trpcRouter;
