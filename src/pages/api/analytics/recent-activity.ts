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
    const eventType = url.searchParams.get('eventType') || '';
    const inviteSlug = url.searchParams.get('invite') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereClause = "a.event_type IN ('view', 'rsvp_button_click', 'rsvp_action_success', 'rsvp_action_error', 'rsvp_action_exception')";
    const params = [];

    if (eventType) {
      whereClause += " AND a.event_type = ?";
      params.push(eventType);
    }

    if (inviteSlug) {
      whereClause += " AND i.slug = ?";
      params.push(inviteSlug);
    }

    // Get filtered recent activity
    const activity = await db.prepare(`
      SELECT 
        a.id, a.timestamp, a.ip_address, a.user_agent,
        a.event_type, a.event_data,
        i.name, i.lastname, i.slug, i.secondary_name, i.secondary_lastname
      FROM analytics a
      LEFT JOIN invitations i ON a.invitation_id = i.id
      WHERE ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    // Get total count for pagination with same filters
    const totalCount = await db.prepare(`
      SELECT COUNT(*) as count
      FROM analytics a
      LEFT JOIN invitations i ON a.invitation_id = i.id
      WHERE ${whereClause}
    `).bind(...params).first();

    return new Response(JSON.stringify({
      success: true,
      data: {
        activity: activity?.results || [],
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
    console.error('Error fetching recent activity:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
