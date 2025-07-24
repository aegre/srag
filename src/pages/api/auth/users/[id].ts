import type { APIRoute } from 'astro';
import { jwtVerify } from 'jose';

// Helper function to authenticate admin
async function authenticateAdmin(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(
    (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production'
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

// GET - Get specific user by ID
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

    // Check if user is admin
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    // Get user ID from URL
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    if (!userId || isNaN(parseInt(userId))) {
      return new Response(JSON.stringify({
        error: 'ID de usuario inválido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user by ID
    const userData = await db.prepare(`
      SELECT 
        id, username, email, role, is_active, created_at, last_login
      FROM admin_users
      WHERE id = ?
    `).bind(userId).first();

    if (!userData) {
      return new Response(JSON.stringify({
        error: 'Usuario no encontrado'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: userData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update specific user
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

    // Check if user is admin
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    // Get user ID from URL
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    if (!userId || isNaN(parseInt(userId))) {
      return new Response(JSON.stringify({
        error: 'ID de usuario inválido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { username, email, password, role, is_active } = await context.request.json();

    // Validate input
    if (!username || !email) {
      return new Response(JSON.stringify({
        error: 'El nombre de usuario y email son requeridos'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return new Response(JSON.stringify({
        error: 'El nombre de usuario debe tener entre 3 y 20 caracteres'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'El formato del email no es válido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate role
    if (!['admin', 'editor'].includes(role)) {
      return new Response(JSON.stringify({
        error: 'El rol debe ser "admin" o "editor"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existingUser = await db.prepare(
      'SELECT id FROM admin_users WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      return new Response(JSON.stringify({
        error: 'Usuario no encontrado'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if username already exists (excluding current user)
    const existingUsername = await db.prepare(
      'SELECT id FROM admin_users WHERE username = ? AND id != ?'
    ).bind(username, userId).first();

    if (existingUsername) {
      return new Response(JSON.stringify({
        error: 'El nombre de usuario ya existe'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email already exists (excluding current user)
    const existingEmail = await db.prepare(
      'SELECT id FROM admin_users WHERE email = ? AND id != ?'
    ).bind(email, userId).first();

    if (existingEmail) {
      return new Response(JSON.stringify({
        error: 'El email ya está registrado'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update query
    let updateQuery = 'UPDATE admin_users SET username = ?, email = ?, role = ?, is_active = ?';
    let queryParams = [username, email, role, is_active ? 1 : 0];

    // Add password update if provided
    if (password) {
      if (password.length < 8) {
        return new Response(JSON.stringify({
          error: 'La contraseña debe tener al menos 8 caracteres'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      updateQuery += ', password_hash = ?';
      queryParams.push(passwordHash);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(userId);

    // Update user
    const result = await db.prepare(updateQuery).bind(...queryParams).run();

    if (!result.success) {
      throw new Error('Error al actualizar el usuario en la base de datos');
    }

    // Get the updated user (without password)
    const updatedUser = await db.prepare(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM admin_users WHERE id = ?'
    ).bind(userId).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// DELETE - Delete specific user
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

    // Check if user is admin
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = (context.locals as any).runtime?.env?.DB;
    if (!db) {
      throw new Error('Base de datos no disponible');
    }

    // Get user ID from URL
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    if (!userId || isNaN(parseInt(userId))) {
      return new Response(JSON.stringify({
        error: 'ID de usuario inválido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existingUser = await db.prepare(
      'SELECT id, username, role FROM admin_users WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      return new Response(JSON.stringify({
        error: 'Usuario no encontrado'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent deleting the "admin" user (username = "admin")
    if (existingUser.username.toLowerCase() === 'admin') {
      return new Response(JSON.stringify({
        error: 'No se puede eliminar el usuario administrador principal del sistema'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent self-deletion
    if (user.id === parseInt(userId)) {
      return new Response(JSON.stringify({
        error: 'No puedes eliminar tu propia cuenta de usuario'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent deleting the last admin user
    if (existingUser.role === 'admin') {
      const adminCount = await db.prepare(
        'SELECT COUNT(*) as count FROM admin_users WHERE role = "admin" AND is_active = 1'
      ).first();

      if (adminCount?.count <= 1) {
        return new Response(JSON.stringify({
          error: 'No se puede eliminar el último administrador del sistema'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Delete user
    const result = await db.prepare(
      'DELETE FROM admin_users WHERE id = ?'
    ).bind(userId).run();

    if (!result.success) {
      throw new Error('Error al eliminar el usuario de la base de datos');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario eliminado exitosamente'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 