import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { slug, action } = await request.json();

    if (!slug) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Slug de invitación requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!action || !['confirm', 'unconfirm'].includes(action)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Acción requerida: confirm o unconfirm'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Error de base de datos'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get client IP for analytics
    const clientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Update the invitation based on action
    const isConfirmed = action === 'confirm' ? 1 : 0;
    const result = await db.prepare(
      'UPDATE invitations SET is_confirmed = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND is_active = 1'
    ).bind(isConfirmed, slug).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invitación no encontrada'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log analytics event
    try {
      await db.prepare(`
        INSERT INTO analytics_events (event_type, event_data, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        'invitation_confirmation_change',
        JSON.stringify({
          slug,
          action,
          is_confirmed: isConfirmed,
          timestamp: new Date().toISOString()
        }),
        clientIP,
        request.headers.get('user-agent') || 'unknown'
      ).run();
    } catch (analyticsError) {
      console.error('Error logging analytics:', analyticsError);
      // Don't fail the main request if analytics fails
    }

    const message = action === 'confirm'
      ? 'Invitación confirmada exitosamente'
      : 'Invitación desconfirmada exitosamente';

    return new Response(JSON.stringify({
      success: true,
      message,
      action,
      is_confirmed: isConfirmed
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error confirming invitation:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 