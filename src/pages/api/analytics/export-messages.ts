import type { APIRoute } from 'astro';
import { formatLocalDateFull } from '../../../utils/dateUtils';

export const GET: APIRoute = async (context) => {
  try {
    // Check authentication
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'No autorizado'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);

    // Validate token (you might want to add proper JWT validation here)
    // For now, we'll assume the token is valid if it exists

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({
        error: 'Base de datos no disponible'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all message events from analytics
    const messages = await db.prepare(`
      SELECT 
        a.event_data,
        a.timestamp,
        i.slug as invitation_slug
      FROM analytics a
      LEFT JOIN invitations i ON a.invitation_id = i.id
      WHERE a.event_type = 'message'
      ORDER BY a.timestamp DESC
    `).all();

    if (!messages.results || messages.results.length === 0) {
      return new Response(JSON.stringify({
        error: 'No hay mensajes para exportar'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse event_data and create CSV
    const csvRows = [
      // CSV Header
      ['Nombre del Invitado', 'Mensaje', 'Invitación', 'Fecha']
    ];

    for (const message of messages.results) {
      try {
        const eventData = JSON.parse(message.event_data);
        const guestName = eventData.guest_name || 'Anónimo';
        const messageText = eventData.message || '';
        const invitationSlug = message.invitation_slug || 'N/A';
        // Convert UTC timestamp to local timezone
        const createdAt = formatLocalDateFull(message.timestamp);

        // Escape CSV values (handle commas and quotes)
        const escapeCsvValue = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        csvRows.push([
          escapeCsvValue(guestName),
          escapeCsvValue(messageText),
          escapeCsvValue(invitationSlug),
          escapeCsvValue(createdAt)
        ]);
      } catch (error) {
        console.error('Error parsing message data:', error);
        // Skip malformed entries
        continue;
      }
    }

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mensajes_julietta_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting messages:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 