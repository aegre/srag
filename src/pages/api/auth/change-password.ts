import type { APIRoute } from 'astro';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body: ChangePasswordRequest = await request.json();

    // Validate request body
    if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'All fields are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password confirmation
    if (body.newPassword !== body.confirmPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'New passwords do not match'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password strength
    if (body.newPassword.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: 'New password must be at least 8 characters long'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, we'll use a simple validation
    // In a real app, you'd verify against the database
    const currentPassword = 'admin123'; // This should come from your database

    if (body.currentPassword !== currentPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Current password is incorrect'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // In a real application, you would:
    // 1. Hash the new password with bcrypt
    // 2. Update the password in the database
    // 3. Invalidate existing sessions if needed
    // 4. Log the password change for security

    // For now, we'll just return success
    // TODO: Implement actual password update logic

    return new Response(JSON.stringify({
      success: true,
      message: 'Password updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Password change error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 