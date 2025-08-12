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
    const offset = (page - 1) * limit;

    // Get all invitations with view counts, ordered by views
    const invitations = await db.prepare(`
      SELECT 
        i.id, i.name, i.lastname, i.slug, i.is_active, i.is_confirmed,
        COUNT(a.id) as view_count,
        i.created_at, i.updated_at
      FROM invitations i
      LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = "view"
      WHERE i.is_active = 1
      GROUP BY i.id, i.name, i.lastname, i.slug, i.is_active, i.is_confirmed, i.created_at, i.updated_at
      ORDER BY view_count DESC, i.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // Get total count for pagination
    const totalCount = await db.prepare(`
      SELECT COUNT(*) as count
      FROM invitations
      WHERE is_active = 1
    `).first();

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
