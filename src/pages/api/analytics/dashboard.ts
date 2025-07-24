import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({
        error: 'Base de datos no disponible'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get analytics data
    const [
      totalViews,
      viewsLast7Days,
      viewsLast30Days,
      recentViews,
      recentRsvpEvents,
      topInvitations,
      viewsByDay,
      confirmationEvents,
      recentConfirmations
    ] = await Promise.all([
      // Total views
      db.prepare('SELECT COUNT(*) as count FROM analytics WHERE event_type = "view"').first(),

      // Views in last 7 days
      db.prepare(`
        SELECT COUNT(*) as count 
        FROM analytics 
        WHERE event_type = "view" 
        AND timestamp >= datetime('now', '-7 days')
      `).first(),

      // Views in last 30 days
      db.prepare(`
        SELECT COUNT(*) as count 
        FROM analytics 
        WHERE event_type = "view" 
        AND timestamp >= datetime('now', '-30 days')
      `).first(),

      // Recent views (last 10)
      db.prepare(`
        SELECT 
          a.id, a.timestamp, a.ip_address, a.user_agent,
          i.name, i.lastname, i.slug
        FROM analytics a
        LEFT JOIN invitations i ON a.invitation_id = i.id
        WHERE a.event_type = "view"
        ORDER BY a.timestamp DESC
        LIMIT 10
      `).all(),

      // Recent RSVP events (last 10)
      db.prepare(`
        SELECT 
          a.id, a.timestamp, a.ip_address, a.user_agent,
          a.event_type, a.event_data,
          i.name, i.lastname, i.slug
        FROM analytics a
        LEFT JOIN invitations i ON a.invitation_id = i.id
        WHERE a.event_type IN ('rsvp_button_click', 'rsvp_action_success', 'rsvp_action_error', 'rsvp_action_exception')
        ORDER BY a.timestamp DESC
        LIMIT 10
      `).all(),

      // Top invitations by views
      db.prepare(`
        SELECT 
          i.id, i.name, i.lastname, i.slug,
          COUNT(a.id) as view_count
        FROM invitations i
        LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = "view"
        WHERE i.is_active = 1
        GROUP BY i.id, i.name, i.lastname, i.slug
        ORDER BY view_count DESC
        LIMIT 10
      `).all(),

      // Views by day (last 7 days)
      db.prepare(`
        SELECT 
          DATE(a.timestamp) as date,
          COUNT(*) as count
        FROM analytics a
        WHERE a.event_type = "view" 
        AND a.timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(a.timestamp)
        ORDER BY date DESC
      `).all(),

      // Confirmation events (last 10)
      db.prepare(`
        SELECT 
          ae.id, ae.timestamp as timestamp, ae.ip_address, ae.user_agent,
          JSON_EXTRACT(ae.event_data, '$.slug') as slug,
          JSON_EXTRACT(ae.event_data, '$.action') as action
        FROM analytics ae
        WHERE ae.event_type = 'invitation_confirmation_change'
        ORDER BY ae.timestamp DESC
        LIMIT 10
      `).all(),

      // Recent confirmations by day (last 7 days)
      db.prepare(`
        SELECT 
          DATE(ae.timestamp) as date,
          JSON_EXTRACT(ae.event_data, '$.action') as action,
          COUNT(*) as count
        FROM analytics ae
        WHERE ae.event_type = 'invitation_confirmation_change'
        AND ae.timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(ae.timestamp), JSON_EXTRACT(ae.event_data, '$.action')
        ORDER BY date DESC
      `).all()
    ]);

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalViews: totalViews?.count || 0,
        viewsLast7Days: viewsLast7Days?.count || 0,
        viewsLast30Days: viewsLast30Days?.count || 0,
        recentViews: recentViews?.results || [],
        recentRsvpEvents: recentRsvpEvents?.results || [],
        topInvitations: topInvitations?.results || [],
        viewsByDay: viewsByDay?.results || [],
        confirmationEvents: confirmationEvents?.results || [],
        recentConfirmations: recentConfirmations?.results || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 