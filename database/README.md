# Quinceañera CMS Database

This directory contains the database schema and management tools for the Quinceañera CMS built with Cloudflare D1.

## 🗄️ Database Structure

The database consists of the following tables:

### Core Tables
- **`invitations`** - Individual invitation instances with all customization data
- **`analytics`** - Tracks user interactions and page views
- **`rsvp_responses`** - Guest RSVP responses and information

### Admin Tables
- **`admin_users`** - CMS admin users and authentication
- **`sessions`** - User session management

## 🚀 Getting Started

### Prerequisites
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed globally
- Node.js 16+ 
- Cloudflare account

### Initial Setup

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Initialize the database**:
   ```bash
   npm run db:init
   ```

This will:
- Create the local D1 database
- Run all migrations
- Set up the default template
- Create the default admin user

## 📋 Available Scripts

### Database Management
```bash
# Initialize database (first time setup)
npm run db:init

# Apply migrations locally
npm run db:migrate

# Apply migrations to production
npm run db:migrate:prod

# View database tables (local)
npm run db:studio

# Reset local database (destructive!)
npm run db:reset
```

### Manual Database Commands

```bash
# Create database
wrangler d1 create julifestdb

# Execute SQL file
wrangler d1 execute julifestdb --local --file=database/migrations/0001_initial_schema.sql

# Run SQL command directly
wrangler d1 execute julifestdb --local --command="SELECT * FROM invitations;"

# Production commands (remove --local flag)
wrangler d1 execute julifestdb-prod --command="SELECT COUNT(*) FROM invitations;"
```

## 🔧 Configuration

### Database Bindings

The database is configured in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "julifestdb"
database_id = "your-database-id"

[[env.production.d1_databases]]
binding = "DB"
database_name = "julifestdb-prod"
database_id = "your-prod-database-id"
```

### Environment Variables

The database is accessible in your Astro/Cloudflare Workers code via:

```typescript
export async function onRequest(context: any) {
  const { DB } = context.env;
  
  // Query the database
  const result = await DB.prepare("SELECT * FROM invitations WHERE slug = ?")
    .bind(slug)
    .first();
}
```

## 📊 Schema Overview

### Invitations Table
Individual invitation instances containing:
- Personal information (celebrant name, event details)
- Venue information
- Custom messages and content
- RSVP settings
- Publication status

### Analytics Table
Tracks user behavior:
- Page views
- Section interactions
- Music playback events
- User agent and referrer data

## 🔐 Security

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **⚠️ IMPORTANT**: Change these credentials immediately in production!

### Password Security
- Passwords are hashed using bcrypt
- Sessions have expiration timestamps
- Database access is restricted via Cloudflare Workers bindings

## 🚀 Deployment

### Local Development
1. Run `npm run db:init` to set up local database
2. Use `npm run dev` to start development server
3. Database will be available at `.wrangler/state/d1/`

### Production Deployment
1. Create production database: `wrangler d1 create julifestdb-prod`
2. Update `wrangler.toml` with production database ID
3. Run production migrations: `npm run db:migrate:prod`
4. Deploy: `wrangler pages deploy dist`

## 📈 Monitoring

### View Analytics
```sql
-- Most viewed invitations
SELECT i.celebrant_name, i.slug, COUNT(*) as views 
FROM analytics a 
JOIN invitations i ON a.invitation_id = i.id 
WHERE a.event_type = 'view' 
GROUP BY i.id 
ORDER BY views DESC;

-- RSVP response rates
SELECT i.slug, 
       COUNT(DISTINCT r.id) as total_responses,
       COUNT(CASE WHEN r.attendance_status = 'attending' THEN 1 END) as attending
FROM invitations i 
LEFT JOIN rsvp_responses r ON i.id = r.invitation_id 
GROUP BY i.id;
```

## 🛠️ Troubleshooting

### Common Issues

1. **Migration fails**: Check if database exists and Wrangler is logged in
2. **Local database not found**: Run `npm run db:init` first
3. **Permission denied**: Ensure you're logged into Cloudflare with `wrangler login`

### Debug Commands
```bash
# Check database status
wrangler d1 info julifestdb

# List all tables
wrangler d1 execute julifestdb --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check if migrations table exists
wrangler d1 execute julifestdb --local --command="SELECT * FROM sqlite_master WHERE name='_cf_KV';"
```

## 📝 Migration Guide

### Creating New Migrations

1. Create new SQL file: `database/migrations/XXXX_description.sql`
2. Add migration to `database/init.js` migrations array
3. Run `npm run db:migrate` to apply locally
4. Test thoroughly before applying to production

### Migration Best Practices

- Always use `IF NOT EXISTS` for CREATE statements
- Include rollback procedures in comments
- Test migrations on sample data first
- Backup production database before major changes

## 🔗 Related Documentation

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Astro SSR with Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) 