import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';

async function verifyToken(token: string, secret: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch {
    return null;
  }
}

async function authenticateAdmin(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const secret = (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production';
  return await verifyToken(token, secret);
}

// Hide a message (create visibility record)
export const POST: APIRoute = async (context) => {
  try {
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), { status: 500 });

    const body = await context.request.json();
    const analyticsId = Number(body.analytics_id);
    if (!analyticsId) {
      return new Response(JSON.stringify({ error: 'analytics_id requerido' }), { status: 400 });
    }

    // Ensure message exists and is of type message
    const exists = await db.prepare(`SELECT id FROM analytics WHERE id = ? AND event_type = 'message'`).bind(analyticsId).first();
    if (!exists) {
      return new Response(JSON.stringify({ error: 'Mensaje no encontrado' }), { status: 404 });
    }

    // Insert or ignore to avoid duplicates
    await db.prepare(`INSERT OR IGNORE INTO message_visibility (analytics_id) VALUES (?)`).bind(analyticsId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
};

// Unhide a message (remove visibility record)
export const DELETE: APIRoute = async (context) => {
  try {
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) return new Response(JSON.stringify({ error: 'Base de datos no disponible' }), { status: 500 });

    const url = new URL(context.request.url);
    const analyticsId = Number(url.searchParams.get('analytics_id'));
    if (!analyticsId) {
      return new Response(JSON.stringify({ error: 'analytics_id requerido' }), { status: 400 });
    }

    await db.prepare(`DELETE FROM message_visibility WHERE analytics_id = ?`).bind(analyticsId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
};


