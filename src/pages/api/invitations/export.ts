import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  try {
    // Get database from context
    const db = (context.locals as any).runtime?.env?.DB;

    // Get all invitations with their status
    const invitations = await db.prepare(`
      SELECT 
        i.id,
        i.name,
        i.lastname,
        i.slug,
        i.number_of_passes,
        i.is_confirmed,
        i.is_active,
        count(a.invitation_id) as view_count,
        i.created_at,
        i.updated_at,
        CASE 
          WHEN i.is_confirmed = 1 THEN 'Confirmada'
          WHEN i.is_active = 1 THEN 'Pendiente'
          ELSE 'Inactiva'
        END as status_es
      FROM invitations i JOIN analytics a on i.id = a.invitation_id and a.event_type = 'view'
      ORDER BY i.created_at DESC
    `).all();

    // Create CSV content
    const csvHeaders = [
      'ID',
      'Nombre',
      'Apellido',
      'Slug',
      'Número de Pases',
      'Estado',
      'Vistas',
      'Fecha de Creación',
      'Última Actualización'
    ];

    const csvRows = invitations.results.map((invitation: any) => [
      invitation.id,
      invitation.name,
      invitation.lastname,
      invitation.slug,
      invitation.number_of_passes,
      invitation.status_es,
      invitation.view_count,
      invitation.created_at,
      invitation.updated_at
    ]);

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