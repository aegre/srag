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

    // Get unique event types
    const eventTypes = await db.prepare(`
      SELECT DISTINCT event_type
      FROM analytics
      WHERE event_type IN ('view', 'rsvp_button_click', 'rsvp_action_success', 'rsvp_action_error', 'rsvp_action_exception')
      ORDER BY event_type
    `).all();

    // Get unique invites (slugs) that have activity
    const invites = await db.prepare(`
      SELECT DISTINCT i.slug, i.name, i.lastname, i.secondary_name, i.secondary_lastname
      FROM analytics a
      LEFT JOIN invitations i ON a.invitation_id = i.id
      WHERE a.event_type IN ('view', 'rsvp_button_click', 'rsvp_action_success', 'rsvp_action_error', 'rsvp_action_exception')
        AND i.slug IS NOT NULL
      ORDER BY i.name, i.lastname
    `).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        eventTypes: eventTypes?.results?.map((et: any) => et.event_type) || [],
        invites: invites?.results?.map((inv: any) => ({
          slug: inv.slug,
          name: `${inv.name} ${inv.lastname ? inv.lastname : ''}`.trim(),
          coupleName: inv.secondary_name ? `/ ${inv.secondary_name ? inv.secondary_name : ''} ${inv.secondary_lastname ? inv.secondary_lastname : ''}`.trim() : null
        })) || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
