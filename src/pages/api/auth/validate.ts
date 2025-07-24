import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No token provided'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For now, we'll do a simple validation
    // In a real app, you'd verify the JWT token properly
    if (token === 'admin123' || token.length > 10) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Token is valid'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 