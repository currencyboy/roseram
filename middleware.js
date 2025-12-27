import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();

  // Get the request origin for CORS validation
  const origin = request.headers.get('origin') || '';

  // List of allowed origins
  // For production, add your actual domain here
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Allow all Fly.io preview domains (*.fly.dev)
    '*.fly.dev',
    // Allow from environment
    ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
  ];

  // Check if origin is allowed
  const isOriginAllowed = allowedOrigins.some(allowed => {
    // Handle wildcard subdomains (*.fly.dev)
    if (allowed.includes('*.')) {
      const pattern = allowed.replace('*.', '.*\\.').replace(/\./g, '\\.');
      return new RegExp(`^https?://${pattern}$`).test(origin);
    }
    return origin === allowed;
  });

  console.log('[CORS] Request from origin:', origin, '- Allowed:', isOriginAllowed);

  // Set CORS headers - allow all requests from preview domains
  // This is safe for preview/preview-to-api calls
  if (isOriginAllowed || origin.includes('.fly.dev')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Content Security Policy - restrict to trusted origins
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "frame-src 'self' https://github.com https://*.github.com https://*.fly.dev https://*.sprites.dev https://sprites.dev",
    "connect-src 'self' ws: wss: https://github.com https://*.github.com https://api.github.com https://*.supabase.co https://*.fly.dev https://*.sprites.dev https://sprites.dev http://localhost:* localhost:*",
    "img-src 'self' https: http: data:",
    "font-src 'self' https: http: data:",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
