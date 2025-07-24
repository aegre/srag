import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';

// Helper function to authenticate admin
async function authenticateAdmin(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(
    (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production'
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

// GET - List all admin users or get specific user
export const GET: APIRoute = async (context) => {
  try {
    // Authenticate admin
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    // Get query parameters for pagination
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.prepare('SELECT COUNT(*) as total FROM admin_users').first();
    const total = countResult?.total || 0;

    // Get users with pagination
    const users = await db.prepare(`
      SELECT 
        id, username, email, role, is_active, created_at, last_login
      FROM admin_users
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return new Response(JSON.stringify({
      success: true,
      data: users.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};


