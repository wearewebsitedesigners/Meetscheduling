const { query, pool } = require('../src/db/pool');
const bcrypt = require('bcrypt');

async function createSuperAdmin() {
    try {
        const email = 'superadmin@meetscheduling.com';
        const password = 'password123';
        const username = 'superadmin';

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);

        if (existing.rows.length === 0) {
            // Insert new super admin
            await query(
                `INSERT INTO users (email, username, password_hash, display_name, plan, onboarding_completed, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [email, username, passwordHash, 'Super Admin', 'pro', true, true]
            );
            console.log(`Successfully created super admin!\\nEmail: ${email}\\nPassword: ${password}`);
        } else {
            // Update existing admin password
            await query(
                `UPDATE users SET password_hash = $1 WHERE email = $2`,
                [passwordHash, email]
            );
            console.log(`Successfully updated super admin password!\\nEmail: ${email}\\nPassword: ${password}`);
        }
    } catch (error) {
        console.error('Error creating super admin:', error);
    } finally {
        await pool.end();
    }
}

createSuperAdmin();
