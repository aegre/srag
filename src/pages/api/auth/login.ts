import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export const POST: APIRoute = async (context) => {
  try {
    const { username, password, rememberMe } = await context.request.json();

    // Validate input
    if (!username || !password) {
      return new Response(JSON.stringify({
        error: 'Username and password are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Get database from context (Cloudflare D1 binding)
    const db = (context.locals as any).runtime?.env?.DB;


    // Find user by username
    const userResult = await db.prepare(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1'
    ).bind(username).first();



    if (!userResult) {
      return new Response(JSON.stringify({
        error: 'Invalid username or password'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, userResult.password_hash);

    console.log(await bcrypt.hash(password, 10));
    console.log(password);
    console.log(userResult.password_hash);

    if (!passwordValid) {
      return new Response(JSON.stringify({
        error: 'Invalid username or password'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Create session record
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    // Session expires in 24 hours, or 7 days if "remember me" is checked
    expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 24 * 7 : 24));

    await db.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, userResult.id, expiresAt.toISOString()).run();

    // Update last login time
    await db.prepare(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(userResult.id).run();

    // Create JWT token
    const secret = new TextEncoder().encode(
      (context.locals as any).runtime?.env?.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    const token = await new SignJWT({
      sub: userResult.id.toString(),
      username: userResult.username,
      role: userResult.role,
      sessionId: sessionId
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(secret);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      token: token,
      user: {
        id: userResult.id,
        username: userResult.username,
        email: userResult.email,
        role: userResult.role
      },
      expiresAt: expiresAt.toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 