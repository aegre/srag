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

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({
        error: 'Base de datos no disponible'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all non-hidden message events from analytics with invitation data
    const messages = await db.prepare(`
      SELECT 
        a.event_data,
        a.timestamp,
        i.slug as invitation_slug,
        i.name,
        i.lastname,
        i.secondary_name,
        i.secondary_lastname
      FROM analytics a
      LEFT JOIN invitations i ON a.invitation_id = i.id
      LEFT JOIN message_visibility mv ON mv.analytics_id = a.id
      WHERE a.event_type = 'message' AND mv.analytics_id IS NULL
      ORDER BY a.timestamp DESC
    `).all();

    if (!messages.results || messages.results.length === 0) {
      const header = ['Nombre del Invitado', 'Mensaje', 'Slug', 'Fecha'];
      const csvContent = header.join(',') + '\n';
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mensajes_julietta_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Parse event_data and create CSV
    const csvRows = [
      // CSV Header
      ['Nombre del Invitado', 'Mensaje', 'Slug', 'Fecha']
    ];

    for (const message of messages.results) {
      try {
        const eventData = JSON.parse(message.event_data);
        const messageText = eventData.message || '';
        const invitationSlug = message.invitation_slug || 'N/A';
        // Convert UTC timestamp to local timezone
        const createdAt = formatLocalDateFull(message.timestamp);

        // Format guest name with secondary name and conjunction
        let guestName = 'Anónimo';
        if (message.name) {
          // Format main guest name (handle optional lastname)
          const mainGuest = `${message.name} ${message.lastname || ''}`.trim();

          // Check if there's a secondary guest
          if (message.secondary_name) {
            // Format secondary guest name (handle optional lastname)
            const secondaryGuest = `${message.secondary_name} ${message.secondary_lastname || ''}`.trim();
            guestName = `${mainGuest} y ${secondaryGuest}`;
          } else {
            guestName = mainGuest;
          }
        }

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