import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

export const POST: APIRoute = async (context) => {
  try {
    // Verify admin authentication
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Token de autenticación requerido'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(
      (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    let payload;
    try {
      const { payload: tokenPayload } = await jwtVerify(token, secret);
      payload = tokenPayload;
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Token inválido o expirado'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse request body
    const { username, password, email, role = 'user' } = await context.request.json();

    // Validate input
    if (!username || !password || !email) {
      return new Response(JSON.stringify({
        error: 'El nombre de usuario, contraseña y email son requeridos'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return new Response(JSON.stringify({
        error: 'El nombre de usuario debe tener entre 3 y 20 caracteres'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({
        error: 'La contraseña debe tener al menos 8 caracteres'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'El formato del email no es válido'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate role
    if (!['admin', 'editor'].includes(role)) {
      return new Response(JSON.stringify({
        error: 'El rol debe ser "admin" o "editor"'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Get database
    const db = (context.locals as any).runtime?.env?.DB;

    // Check if username already exists
    const existingUser = await db.prepare(
      'SELECT id FROM admin_users WHERE username = ?'
    ).bind(username).first();

    if (existingUser) {
      return new Response(JSON.stringify({
        error: 'El nombre de usuario ya existe'
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if email already exists
    const existingEmail = await db.prepare(
      'SELECT id FROM admin_users WHERE email = ?'
    ).bind(email).first();

    if (existingEmail) {
      return new Response(JSON.stringify({
        error: 'El email ya está registrado'
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.prepare(
      'INSERT INTO admin_users (username, password_hash, email, role, is_active) VALUES (?, ?, ?, ?, 1)'
    ).bind(username, passwordHash, email, role).run();

    if (!result.success) {
      throw new Error('Error al crear el usuario en la base de datos');
    }

    // Get the created user (without password)
    const newUser = await db.prepare(
      'SELECT id, username, email, role, created_at FROM admin_users WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario creado exitosamente',
      user: newUser
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
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