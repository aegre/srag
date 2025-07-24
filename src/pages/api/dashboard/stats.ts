import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';

// Helper function to verify JWT token
async function verifyToken(token: string, secret: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch (error) {
    return null;
  }
}

// Helper function to authenticate admin requests
async function authenticateAdmin(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production';

  const payload = await verifyToken(token, secret);
  if (!payload) {
    return null;
  }

  return payload;
}

// GET - Dashboard statistics
export const GET: APIRoute = async (context) => {
  try {
    // Authenticate admin
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'No autorizado'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    // Get total invitations count
    const totalInvitations = await db.prepare(
      'SELECT COUNT(*) as count FROM invitations WHERE is_active = 1'
    ).first();

    // Get total confirmed invitations count  
    const totalConfirmed = await db.prepare(
      'SELECT COUNT(*) as count FROM invitations WHERE is_active = 1 AND is_confirmed = 1'
    ).first();

    // Get total unique invitations viewed
    const totalViews = await db.prepare(
      'SELECT COUNT(DISTINCT invitation_id) as count FROM analytics WHERE event_type = "view"'
    ).first();

    // Get pending invitations (active but not confirmed)
    const pendingInvitations = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM invitations 
      WHERE is_active = 1 AND is_confirmed = 0
    `).first();

    // Get recent activity (last 7 days)
    const recentViews = await db.prepare(`
      SELECT COUNT(DISTINCT invitation_id) as count 
      FROM analytics 
      WHERE event_type = "view" 
      AND timestamp >= datetime('now', '-7 days')
    `).first();

    const recentConfirmations = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM invitations 
      WHERE is_confirmed = 1 
      AND updated_at >= datetime('now', '-7 days')
    `).first();

    // Get top viewed invitations
    const topInvitations = await db.prepare(`
      SELECT 
        i.slug,
        i.name,
        i.lastname,
        COUNT(a.id) as view_count
      FROM invitations i
      LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = 'view'
      WHERE i.is_active = 1
      GROUP BY i.id, i.slug, i.name, i.lastname
      ORDER BY view_count DESC
      LIMIT 5
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        totals: {
          invitations: totalInvitations?.count || 0,
          rsvps: totalConfirmed?.count || 0,
          views: totalViews?.count || 0,
          pending_rsvps: pendingInvitations?.count || 0
        },
        recent: {
          views_last_7_days: recentViews?.count || 0,
          rsvps_last_7_days: recentConfirmations?.count || 0
        },
        top_invitations: topInvitations.results || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 