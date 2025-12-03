require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.escrow.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.order.deleteMany();
    await prisma.bid.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared');
  }

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Create Users
  console.log('👥 Creating users...');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  const seller1 = await prisma.user.upsert({
    where: { email: 'seller1@example.com' },
    update: {},
    create: {
      email: 'seller1@example.com',
      username: 'seller1',
      password: hashedPassword,
      role: 'seller',
    },
  });

  const buyer1 = await prisma.user.upsert({
    where: { email: 'buyer1@example.com' },
    update: {},
    create: {
      email: 'buyer1@example.com',
      username: 'buyer1',
      password: hashedPassword,
      role: 'buyer',
    },
  });

  const courier1 = await prisma.user.upsert({
    where: { email: 'courier1@example.com' },
    update: {},
    create: {
      email: 'courier1@example.com',
      username: 'courier1',
      password: hashedPassword,
      role: 'courier',
      lastKnownLat: 40.7128,
      lastKnownLng: -74.0060, // New York coordinates
    },
  });

  console.log(`✅ Created users:
    - Admin: admin@example.com / Password123!
    - Seller: seller1@example.com / Password123!
    - Buyer: buyer1@example.com / Password123!
    - Courier: courier1@example.com / Password123!
  `);

  // Create Products
  console.log('📦 Creating products...');
  
  const products = await Promise.all([
    prisma.product.create({
      data: {
        title: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life',
        price: 129.99,
        sellerId: seller1.id,
      },
    }),
    prisma.product.create({
      data: {
        title: 'Smart Watch Series 5',
        description: 'Advanced fitness tracking, heart rate monitor, GPS, water-resistant',
        price: 299.99,
        sellerId: seller1.id,
      },
    }),
    prisma.product.create({
      data: {
        title: 'Ergonomic Wireless Mouse',
        description: 'Comfortable design for all-day use, precision tracking, programmable buttons',
        price: 49.99,
        sellerId: seller1.id,
      },
    }),
    prisma.product.create({
      data: {
        title: 'Mechanical Keyboard RGB',
        description: 'Cherry MX switches, customizable RGB lighting, durable construction',
        price: 159.99,
        sellerId: seller1.id,
      },
    }),
    prisma.product.create({
      data: {
        title: 'USB-C Hub 7-in-1',
        description: 'Multi-port adapter with HDMI, USB 3.0, SD card reader, and power delivery',
        price: 39.99,
        sellerId: seller1.id,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create Bids (Requests from buyers)
  console.log('💰 Creating bid requests...');
  
  const bid1 = await prisma.bid.create({
    data: {
      productId: null, // General request, not tied to specific product
      buyerId: buyer1.id,
      amount: 100.00,
      message: 'Looking for a good quality laptop under $1000. Need it for coding and design work.',
      status: 'open',
    },
  });

  const bid2 = await prisma.bid.create({
    data: {
      productId: products[0].id, // Specific product bid
      buyerId: buyer1.id,
      amount: 110.00,
      message: 'Interested in these headphones. Can you do $110 with free shipping?',
      status: 'open',
    },
  });

  console.log(`✅ Created 2 bid requests`);

  console.log('\n🎉 Database seeding completed successfully!\n');
  console.log('📝 Test Credentials:');
  console.log('   Email: admin@example.com | seller1@example.com | buyer1@example.com | courier1@example.com');
  console.log('   Password: Password123! (for all users)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
