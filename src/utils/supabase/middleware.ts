import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { VERIFIED_USER_HEADER } from "@/lib/auth-constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const updateSession = async (request: NextRequest) => {
  const requestHeaders = new Headers(request.headers);
  // ASVS 4.1.3: replace any caller-supplied identity header with a value from
  // verified signed claims so downstream server components cannot be spoofed.
  requestHeaders.delete(VERIFIED_USER_HEADER);
  const pendingCookies: Array<{ name: string; value: string; options?: any }> = [];

  const createResponse = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    );
    return response;
  };

  const createRedirect = (url: URL) => {
    const response = NextResponse.redirect(url);
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    );
    return response;
  };

  let supabaseResponse = createResponse();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        pendingCookies.push(...cookiesToSet);
        supabaseResponse = createResponse();
      },
    },
  });

  // ASVS 7.2.1, 8.2.1: verify signed session claims with the trusted auth
  // service before granting access to protected routes.
  const { data: claimsData } = await supabase.auth.getClaims();
  const verifiedUserId = claimsData?.claims?.sub;
  const isAuthenticated = typeof verifiedUserId === "string";

  if (isAuthenticated) {
    requestHeaders.set(VERIFIED_USER_HEADER, verifiedUserId);
    supabaseResponse = createResponse();
  }

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/auth");

  // If user is not authenticated and trying to access a protected route
  if (!isAuthenticated && !isAuthPage && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnUrl", request.nextUrl.pathname + request.nextUrl.search);
    return createRedirect(url);
  }

  // If user is authenticated and trying to access login/register
  if (isAuthenticated && isAuthPage && !request.nextUrl.pathname.startsWith("/auth/signout") && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return createRedirect(url);
  }

  return supabaseResponse;
};
