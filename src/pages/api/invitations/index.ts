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
  const secret = env.JWT_SECRET || 'your-secret-key-change-in-production';

  const payload = await verifyToken(token, secret);
  if (!payload) {
    return null;
  }

  return payload;
}

// GET - List all invitations
export const GET: APIRoute = async (context, env) => {
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

    const db = env.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    // Get query parameters for pagination
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.prepare('SELECT COUNT(*) as total FROM invitations').first();
    const total = countResult?.total || 0;

    // Get invitations with pagination and view counts
    const invitations = await db.prepare(`
      SELECT 
        i.id, i.slug, i.name, i.lastname, i.number_of_passes, 
        i.is_confirmed, i.is_active, i.created_at, i.updated_at,
        COALESCE(COUNT(a.id), 0) as view_count
      FROM invitations i
      LEFT JOIN analytics a ON i.id = a.invitation_id AND a.event_type = 'view'
      GROUP BY i.id, i.slug, i.name, i.lastname, i.number_of_passes, 
               i.is_confirmed, i.is_active, i.created_at, i.updated_at
      ORDER BY i.created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // Since we removed the RSVP responses table, we don't need to calculate RSVP counts
    const invitationsWithStats = invitations.results.map((invitation: any) => ({
      ...invitation,
      rsvp_count: 0 // No RSVP responses table, so always 0
    }));

    return new Response(JSON.stringify({
      success: true,
      data: invitationsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing invitations:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new invitation
export const POST: APIRoute = async (context, env) => {
  try {
    // Authenticate admin
    const user = await authenticateAdmin(context);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'No autorizado'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    const invitationData = await context.request.json();

    // Validate required fields
    if (!invitationData.name || !invitationData.lastname || !invitationData.slug) {
      return new Response(JSON.stringify({
        error: 'El nombre, apellido y URL personalizada son requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if slug already exists
    const existingInvitation = await db.prepare(
      'SELECT id FROM invitations WHERE slug = ?'
    ).bind(invitationData.slug).first();

    if (existingInvitation) {
      return new Response(JSON.stringify({
        error: 'La URL personalizada ya existe. Por favor elige una URL diferente.'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert new invitation
    const result = await db.prepare(`
      INSERT INTO invitations (
        slug, name, lastname, number_of_passes,
        is_confirmed, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      invitationData.slug,
      invitationData.name,
      invitationData.lastname,
      invitationData.number_of_passes || 1,
      invitationData.is_confirmed || false,
      invitationData.is_active !== false // default to true
    ).run();

    if (!result.success) {
      throw new Error('Error al crear la invitación');
    }

    // Get the created invitation
    const newInvitation = await db.prepare(
      'SELECT * FROM invitations WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return new Response(JSON.stringify({
      success: true,
      data: newInvitation,
      message: 'Invitación creada exitosamente'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 