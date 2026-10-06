import { db } from './index.js';
import { users } from './schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const firstName = 'System';
  const lastName = 'Admin';

  console.log(`🌱 Seeding default admin account (${email})...`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    await db
      .update(users)
      .set({
        firstName,
        lastName,
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
    console.log(`✅ Existing account found with ${email} - updated to active Admin.`);
  } else {
    await db.insert(users).values({
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`✅ Default admin account created successfully!`);
  }

  console.log(`
=========================================
  Default Admin Credentials
=========================================
  Email:    ${email}
  Password: ${password}
  Role:     admin
  Active:   true
=========================================
`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('❌ Failed to seed admin account:', err);
  process.exit(1);
});
