import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Create test users with different roles
  const users = [
    {
      email: 'employee@test.com',
      name: 'John Employee',
      password: 'password123',
      role: 'EMPLOYEE',
    },
    {
      email: 'hr@test.com',
      name: 'Sarah HR Manager',
      password: 'password123',
      role: 'HR',
    },
    {
      email: 'manager@test.com',
      name: 'Mike Manager',
      password: 'password123',
      role: 'MANAGER',
    },
    {
      email: 'admin@test.com',
      name: 'Admin User',
      password: 'password123',
      role: 'HR',
    },
  ];

  console.log('👥 Creating test users...');

  for (const userData of users) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
      continue;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role as Role,
      },
    });

    console.log(`   ✅ Created user: ${user.name} (${user.email}) - Role: ${user.role}`);

    // Create some sample tasks and time entries for each user
    const task1 = await prisma.task.create({
      data: {
        title: `Sample Task 1 for ${user.name}`,
        description: 'This is a sample task for testing',
        userId: user.id,
      },
    });

    const task2 = await prisma.task.create({
      data: {
        title: `Sample Task 2 for ${user.name}`,
        description: 'Another sample task for testing',
        userId: user.id,
      },
    });

    // Create time entries
    await prisma.timeEntry.create({
      data: {
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        taskId: task1.id,
        userId: user.id,
      },
    });

    await prisma.timeEntry.create({
      data: {
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        endTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        taskId: task2.id,
        userId: user.id,
      },
    });

    console.log(`   📝 Created sample tasks and time entries for ${user.name}`);
  }

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📋 Test Users Created:');
  console.log('   • Employee: employee@test.com (password: password123)');
  console.log('   • HR Manager: hr@test.com (password: password123)');
  console.log('   • Manager: manager@test.com (password: password123)');
  console.log('   • Admin: admin@test.com (password: password123)');
  console.log('\n🔐 Login with any of these accounts to test role-based features!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });