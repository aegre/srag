import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';

export const GET: APIRoute = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No se proporcionó token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = new TextEncoder().encode(
      (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    try {
      // Verify JWT token
      const { payload } = await jwtVerify(token, secret);

      // Validate payload structure
      if (!payload.sub) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token inválido: falta información del usuario'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get database to verify user still exists and get current data
      const db = (context.locals as any).runtime?.env?.DB;
      if (!db) {
        throw new Error('Base de datos no disponible');
      }

      // Get user from database to verify they still exist and are active
      const user = await db.prepare(`
        SELECT id, username, email, role, is_active, created_at, last_login
        FROM admin_users 
        WHERE id = ? AND is_active = 1
      `).bind(payload.sub).first();

      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Usuario no encontrado o inactivo'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if token is not expired (payload.exp should be set during login)
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token expirado'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update last login time
      await db.prepare(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(payload.sub).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Token válido',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          last_login: user.last_login
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Token inválido o expirado'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Token validation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 