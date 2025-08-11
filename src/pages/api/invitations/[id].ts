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

// GET - Get single invitation
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
      throw new Error('Base de datos no disponible');
    }

    const id = context.params.id;
    if (!id) {
      return new Response(JSON.stringify({
        error: 'El ID de la invitación es requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get invitation with view count
    const invitation = await db.prepare(`
      SELECT 
        i.id, i.slug, i.name, i.lastname, i.secondary_name, i.secondary_lastname, i.number_of_passes, 
        i.is_confirmed, i.is_active, i.created_at, i.updated_at,
        COALESCE(COUNT(a.id), 0) as view_count
      FROM invitations i
      LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = 'view'
      WHERE i.id = ?
      GROUP BY i.id, i.slug, i.name, i.lastname, i.secondary_name, i.secondary_lastname, i.number_of_passes, 
               i.is_confirmed, i.is_active, i.created_at, i.updated_at
    `).bind(id).first();

    if (!invitation) {
      return new Response(JSON.stringify({
        error: 'Invitación no encontrada'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const invitationWithStats = {
      ...invitation,
      rsvp_count: 0 // No RSVP responses table, so always 0
    };

    return new Response(JSON.stringify({
      success: true,
      data: invitationWithStats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting invitation:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update invitation
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
      throw new Error('Base de datos no disponible');
    }

    const id = context.params.id;
    if (!id) {
      return new Response(JSON.stringify({
        error: 'El ID de la invitación es requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const invitationData = await context.request.json();

    // Validate required fields
    if (!invitationData.name || !invitationData.slug) {
      return new Response(JSON.stringify({
        error: 'El nombre y la URL personalizada son requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if invitation exists
    const existingInvitation = await db.prepare(
      'SELECT id FROM invitations WHERE id = ?'
    ).bind(id).first();

    if (!existingInvitation) {
      return new Response(JSON.stringify({
        error: 'Invitación no encontrada'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if slug already exists (excluding current invitation)
    const slugConflict = await db.prepare(
      'SELECT id FROM invitations WHERE slug = ? AND id != ?'
    ).bind(invitationData.slug, id).first();

    if (slugConflict) {
      return new Response(JSON.stringify({
        error: 'La URL personalizada ya existe. Por favor elige una URL diferente.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update invitation
    const result = await db.prepare(`
      UPDATE invitations SET
        slug = ?, name = ?, lastname = ?, secondary_name = ?, secondary_lastname = ?, number_of_passes = ?,
        is_confirmed = ?, is_active = ?, updated_at = DATETIME('now')
      WHERE id = ?
    `).bind(
      invitationData.slug,
      invitationData.name,
      invitationData.lastname || null,
      invitationData.secondary_name || null,
      invitationData.secondary_lastname || null,
      invitationData.number_of_passes || 1,
      invitationData.is_confirmed || false,
      invitationData.is_active !== false, // default to true
      id
    ).run();

    if (!result.success) {
      throw new Error('Error al actualizar la invitación');
    }

    // Get the updated invitation
    const updatedInvitation = await db.prepare(
      'SELECT * FROM invitations WHERE id = ?'
    ).bind(id).first();

    return new Response(JSON.stringify({
      success: true,
      data: updatedInvitation,
      message: 'Invitación actualizada exitosamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating invitation:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete invitation
export const DELETE: APIRoute = async (context) => {
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
      throw new Error('Base de datos no disponible');
    }

    const id = context.params.id;
    if (!id) {
      return new Response(JSON.stringify({
        error: 'El ID de la invitación es requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if invitation exists
    const existingInvitation = await db.prepare(
      'SELECT id FROM invitations WHERE id = ?'
    ).bind(id).first();

    if (!existingInvitation) {
      return new Response(JSON.stringify({
        error: 'Invitación no encontrada'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete related RSVP responses first
    await db.prepare(
      'DELETE FROM rsvp_responses WHERE invitation_id = ?'
    ).bind(id).run();

    // Delete invitation
    const result = await db.prepare(
      'DELETE FROM invitations WHERE id = ?'
    ).bind(id).run();

    if (!result.success) {
      throw new Error('Error al eliminar la invitación');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Invitación eliminada exitosamente'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting invitation:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 