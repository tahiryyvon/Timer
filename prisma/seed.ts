// Database seed script for production
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding production database...')

  // Create a test user for production
  const user = await prisma.user.upsert({
    where: { email: 'admin@timer.com' },
    update: {},
    create: {
      email: 'admin@timer.com',
      name: 'Admin User',
      password: 'admin123', // Change this password
      role: 'HR'
    },
  })

  console.log('✅ Created user:', user.email)

  // Create a default task
  const task = await prisma.task.upsert({
    where: { id: 'default-task' },
    update: {},
    create: {
      id: 'default-task',
      title: 'General Work',
      description: 'Default task for time tracking',
      status: 'OPEN',
      userId: user.id
    }
  })

  console.log('✅ Created default task:', task.title)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })