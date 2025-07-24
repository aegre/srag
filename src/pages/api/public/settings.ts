import type { APIRoute } from 'astro';

// GET - Get public settings (no authentication required)
export const GET: APIRoute = async (context) => {
  try {
    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Database not available');
    }

    // Get current settings (there should only be one record)
    const settings = await db.prepare(
      'SELECT is_published, event_date, event_time FROM invitation_settings ORDER BY id DESC LIMIT 1'
    ).first();

    if (!settings) {
      // Return default settings if none exist
      return new Response(JSON.stringify({
        success: true,
        data: {
          is_published: false,
          event_date: null,
          event_time: null
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        is_published: Boolean(settings.is_published),
        event_date: settings.event_date,
        event_time: settings.event_time
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching public settings:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 