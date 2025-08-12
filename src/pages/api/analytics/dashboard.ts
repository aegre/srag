import type { APIRoute } from 'astro';
import { formatDateInTimezone, formatDateShort } from '../../../utils/dateUtils';

export const GET: APIRoute = async (context) => {
  try {
    // Get timezone from query parameters
    const url = new URL(context.request.url);
    const timezone = url.searchParams.get('timezone') || 'UTC';

    // Calculate timezone offset in hours (simplified approach)
    const getTimezoneOffset = (tz: string): number => {
      const offsets: { [key: string]: number } = {
        'America/Mexico_City': -6,
        'America/New_York': -5,
        'America/Los_Angeles': -8,
        'America/Chicago': -6,
        'America/Denver': -7,
        'America/Phoenix': -7,
        'America/Anchorage': -9,
        'America/Honolulu': -10,
        'Europe/London': 0,
        'Europe/Paris': 1,
        'Europe/Berlin': 1,
        'Europe/Madrid': 1,
        'Europe/Rome': 1,
        'Asia/Tokyo': 9,
        'Asia/Shanghai': 8,
        'Asia/Kolkata': 5.5,
        'Australia/Sydney': 10,
        'Australia/Melbourne': 10,
        'Pacific/Auckland': 12,
        'UTC': 0
      };
      return offsets[tz] || 0;
    };

    const timezoneOffset = getTimezoneOffset(timezone);

    const db = (context.locals as any).runtime?.env?.DB;
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
      recentConfirmations,
      messages
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
          i.name, i.lastname, i.slug, i.secondary_name, i.secondary_lastname
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
          i.name, i.lastname, i.slug, i.secondary_name, i.secondary_lastname
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
          i.secondary_name, i.secondary_lastname,
          COUNT(a.id) as view_count
        FROM invitations i
        LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = "view"
        WHERE i.is_active = 1
        GROUP BY i.id, i.name, i.lastname, i.slug, i.secondary_name, i.secondary_lastname
        HAVING COUNT(a.id) > 0
        ORDER BY view_count DESC
        LIMIT 10
      `).all(),

      // Views by day (last 7 days) - with timezone conversion in SQL
      db.prepare(`
        SELECT 
          DATE(datetime(a.timestamp, ? || ' hours')) as date,
          COUNT(*) as count
        FROM analytics a
        WHERE a.event_type = "view" 
        AND a.timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(datetime(a.timestamp, ? || ' hours'))
        ORDER BY date DESC
      `).bind(timezoneOffset, timezoneOffset).all(),

      // Confirmation events (last 10)
      db.prepare(`
        SELECT 
          ae.id, ae.timestamp as timestamp, ae.ip_address, ae.user_agent,
          JSON_EXTRACT(ae.event_data, '$.slug') as slug,
          JSON_EXTRACT(ae.event_data, '$.action') as action
        FROM analytics ae
        WHERE ae.event_type = 'rsvp_action_success'
        ORDER BY ae.timestamp DESC
        LIMIT 10
      `).all(),

      // Recent confirmations by day (last 7 days) - with timezone conversion in SQL
      db.prepare(`
        SELECT 
          DATE(datetime(ae.timestamp, ? || ' hours')) as date,
          JSON_EXTRACT(ae.event_data, '$.action') as action,
          COUNT(*) as count
        FROM analytics ae
        WHERE ae.event_type = 'rsvp_action_success'
        AND ae.timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(datetime(ae.timestamp, ? || ' hours')), JSON_EXTRACT(ae.event_data, '$.action')
        ORDER BY date DESC
      `).bind(timezoneOffset, timezoneOffset).all(),

      // Messages for Julietta with hidden flag and slug
      db.prepare(`
        SELECT 
          a.id, a.timestamp, a.ip_address, a.user_agent,
          a.event_data,
          i.slug AS invitation_slug,
          CASE WHEN mv.analytics_id IS NOT NULL THEN 1 ELSE 0 END AS is_hidden
        FROM analytics a
        LEFT JOIN invitations i ON a.invitation_id = i.id
        LEFT JOIN message_visibility mv ON mv.analytics_id = a.id
        WHERE a.event_type = "message"
        ORDER BY a.timestamp DESC
        LIMIT 50
      `).all()
    ]);

    // Format dates for viewsByDay and recentConfirmations
    const formattedViewsByDay = (viewsByDay?.results || []).map((item: any) => ({
      ...item,
      date: formatDateShort(item.date),
      originalDate: item.date // Keep original for matching
    }));

    const formattedRecentConfirmations = (recentConfirmations?.results || []).map((item: any) => ({
      ...item,
      date: formatDateShort(item.date),
      originalDate: item.date // Keep original for matching
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalViews: totalViews?.count || 0,
        viewsLast7Days: viewsLast7Days?.count || 0,
        viewsLast30Days: viewsLast30Days?.count || 0,
        recentViews: recentViews?.results || [],
        recentRsvpEvents: recentRsvpEvents?.results || [],
        topInvitations: topInvitations?.results || [],
        viewsByDay: formattedViewsByDay,
        confirmationEvents: confirmationEvents?.results || [],
        recentConfirmations: formattedRecentConfirmations,
        messages: messages?.results || []
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