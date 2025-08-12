import type { APIRoute } from 'astro';
import { formatDateInTimezone } from '../../../utils/dateUtils';
import { buildCoupleDisplayName } from '../../../utils/textUtils';

export const GET: APIRoute = async (context) => {
  try {
    // Get timezone from query parameters
    const url = new URL(context.request.url);
    const timezone = url.searchParams.get('timezone') || 'UTC';

    // Get database from context
    const db = (context.locals as any).runtime?.env?.DB;

    // Get all invitations with their status
    const invitations = await db.prepare(`
      SELECT 
        i.id,
        i.name,
        i.lastname,
        i.secondary_name,
        i.secondary_lastname,
        i.slug,
        i.number_of_passes,
        i.is_confirmed,
        i.is_active,
        COALESCE(COUNT(a.id), 0) AS view_count,
        i.created_at,
        i.updated_at,
        CASE 
          WHEN i.is_confirmed = 1 THEN 'Confirmada'
          WHEN i.is_active = 1 THEN 'Pendiente'
          ELSE 'Inactiva'
        END AS status_es
      FROM invitations i
      LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = 'view'
      GROUP BY i.id, i.name, i.lastname, i.secondary_name, i.secondary_lastname, i.slug, i.number_of_passes, i.is_confirmed, i.is_active, i.created_at, i.updated_at
      ORDER BY i.created_at DESC
    `).all();

    // Create CSV content
    const csvHeaders = [
      'ID',
      'Invitado(s)',
      'Invitado Secundario (Legacy)',
      'Slug',
      'Número de Pases',
      'Estado',
      'Vistas',
      'Fecha de Creación',
      'Última Actualización'
    ];

    const csvRows = invitations.results.map((invitation: any) => {
      // Format guest name with conjunction
      const guestName = buildCoupleDisplayName(
        invitation.name,
        invitation.lastname,
        invitation.secondary_name,
        invitation.secondary_lastname
      );

      return [
        invitation.id,
        guestName,
        '', // Empty secondary guest column (now included in main guest name)
        invitation.slug,
        invitation.number_of_passes,
        invitation.status_es,
        invitation.view_count,
        formatDateInTimezone(invitation.created_at, timezone),
        formatDateInTimezone(invitation.updated_at, timezone)
      ];
    });

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `invitaciones_${dateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      error: 'Error al generar el archivo de exportación'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 