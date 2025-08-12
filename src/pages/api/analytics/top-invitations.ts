import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  try {
    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({
        error: 'Base de datos no disponible'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const state = url.searchParams.get('state') || '';
    const status = url.searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereClause = "i.is_active = 1";
    const params: any[] = [];

    if (state === 'viewed') {
      whereClause += " AND EXISTS (SELECT 1 FROM analytics a2 WHERE a2.invitation_id = i.id AND a2.event_type = 'view')";
    } else if (state === 'not_viewed') {
      whereClause += " AND NOT EXISTS (SELECT 1 FROM analytics a2 WHERE a2.invitation_id = i.id AND a2.event_type = 'view')";
    }

    if (status === 'confirmed') {
      whereClause += " AND i.is_confirmed = 1";
    } else if (status === 'pending') {
      whereClause += " AND i.is_confirmed = 0";
    }

    // Get filtered invitations with view counts, ordered by views
    const invitations = await db.prepare(`
      SELECT 
        i.id, i.name, i.lastname, i.slug, i.is_active, i.is_confirmed,
        i.secondary_name, i.secondary_lastname,
        COUNT(a.id) as view_count,
        i.created_at, i.updated_at
      FROM invitations i
      LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = "view"
      WHERE ${whereClause}
      GROUP BY i.id, i.name, i.lastname, i.slug, i.is_active, i.is_confirmed, i.secondary_name, i.secondary_lastname, i.created_at, i.updated_at
      ORDER BY view_count DESC, i.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    // Get total count for pagination with same filters
    const totalCount = await db.prepare(`
      SELECT COUNT(*) as count
      FROM invitations i
      WHERE ${whereClause}
    `).bind(...params).first();

    return new Response(JSON.stringify({
      success: true,
      data: {
        invitations: invitations?.results || [],
        pagination: {
          page,
          limit,
          total: totalCount?.count || 0,
          totalPages: Math.ceil((totalCount?.count || 0) / limit)
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching top invitations:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
