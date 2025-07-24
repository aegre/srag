import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  try {
    // Get client information from headers
    const clientInfo = {
      ip: context.request.headers.get('x-forwarded-for') ||
        context.request.headers.get('cf-connecting-ip') ||
        context.request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: context.request.headers.get('user-agent') || 'unknown',
      referer: context.request.headers.get('referer') || null,
      acceptLanguage: context.request.headers.get('accept-language') || null,
      acceptEncoding: context.request.headers.get('accept-encoding') || null,
      // Cloudflare specific headers
      cfRay: context.request.headers.get('cf-ray') || null,
      cfCountry: context.request.headers.get('cf-ipcountry') || null,
      cfVisitor: context.request.headers.get('cf-visitor') || null,
      // Additional headers that might be useful
      host: context.request.headers.get('host') || null,
      origin: context.request.headers.get('origin') || null,
      // Timestamp
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      success: true,
      data: clientInfo
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error getting client info:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 