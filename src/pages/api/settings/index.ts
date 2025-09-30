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

// GET - Get current settings
export const GET: APIRoute = async (context) => {
  try {
    // Authenticate admin
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Database not available');
    }

    // Get current settings (there should only be one record)
    const settings = await db.prepare(
      'SELECT * FROM invitation_settings ORDER BY id DESC LIMIT 1'
    ).first();

    if (!settings) {
      // Create default settings if none exist
      const result = await db.prepare(`
        INSERT INTO invitation_settings (event_date, event_time, rsvp_enabled, rsvp_deadline, rsvp_phone, rsvp_whatsapp, is_published, thank_you_page_enabled) 
        VALUES (NULL, NULL, 1, NULL, NULL, NULL, 0, 0)
      `).run();

      const newSettings = await db.prepare(
        'SELECT * FROM invitation_settings WHERE id = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true,
        data: newSettings
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: settings
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update settings
export const PUT: APIRoute = async (context) => {
  try {
    // Authenticate admin
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Database not available');
    }

    const settingsData = await context.request.json();

    // Get current settings ID
    const currentSettings = await db.prepare(
      'SELECT id FROM invitation_settings ORDER BY id DESC LIMIT 1'
    ).first();

    if (!currentSettings) {
      return new Response(JSON.stringify({
        error: 'No se encontraron configuraciones'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update settings
    const result = await db.prepare(`
      UPDATE invitation_settings SET
        event_date = ?,
        event_time = ?,
        rsvp_enabled = ?,
        rsvp_deadline = ?,
        rsvp_phone = ?,
        rsvp_whatsapp = ?,
        is_published = ?,
        thank_you_page_enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      settingsData.event_date || null,
      settingsData.event_time || null,
      settingsData.rsvp_enabled === undefined ? true : Boolean(settingsData.rsvp_enabled),
      settingsData.rsvp_deadline || null,
      settingsData.rsvp_phone || null,
      settingsData.rsvp_whatsapp || null,
      settingsData.is_published || false,
      settingsData.thank_you_page_enabled || false,
      currentSettings.id
    ).run();

    if (!result.success) {
      throw new Error('Error al actualizar la configuración');
    }

    // Get updated settings
    const updatedSettings = await db.prepare(
      'SELECT * FROM invitation_settings WHERE id = ?'
    ).bind(currentSettings.id).first();

    return new Response(JSON.stringify({
      success: true,
      data: updatedSettings,
      message: 'Configuración actualizada exitosamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 