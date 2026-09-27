import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isDiscoverRoute = createRouteMatcher(["/discover(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isDiscoverRoute(req)) return;

  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
