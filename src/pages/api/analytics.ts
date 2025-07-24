import type { APIRoute } from 'astro';

export const POST: APIRoute = async (context) => {
  try {
    const db = (context as any).env?.DB;
    if (!db) {
      return new Response(JSON.stringify({
        error: 'Base de datos no disponible'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const analyticsData = await context.request.json();

    // Validate required fields
    if (!analyticsData.event_type) {
      return new Response(JSON.stringify({
        error: 'Tipo de evento es requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get invitation_id from slug if provided
    let invitationId = analyticsData.invitation_id;
    if (analyticsData.slug && !invitationId) {
      const invitation = await db.prepare(
        'SELECT id FROM invitations WHERE slug = ?'
      ).bind(analyticsData.slug).first();

      if (invitation) {
        invitationId = invitation.id;
      }
    }

    // Get real IP address from headers
    const ipAddress = context.request.headers.get('x-forwarded-for') ||
      context.request.headers.get('cf-connecting-ip') ||
      analyticsData.ip_address ||
      'unknown';

    // Insert analytics record
    const result = await db.prepare(`
      INSERT INTO analytics (invitation_id, event_type, event_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      invitationId,
      analyticsData.event_type,
      analyticsData.event_data ? JSON.stringify(analyticsData.event_data) : null,
      ipAddress,
      analyticsData.user_agent || 'unknown'
    ).run();

    if (!result.success) {
      throw new Error('Error al registrar analytics');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Analytics registrado exitosamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error tracking analytics:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 