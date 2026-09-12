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
      businessName: 'Seller1 Shop',
      sellerNiche: 'Electronics',
      sellerOnboarded: false,
      onboardingStep: 1,
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

  // Create public FAQ categories and question-and-answer articles
  console.log('❓ Creating FAQ content...');

  const faqCategories = [
    {
      name: 'Orders and Payments',
      slug: 'orders-and-payments',
      description: 'Answers about placing orders, payments, and order confirmations.',
      icon: 'shopping-bag',
      order: 1,
      articles: [
        {
          title: 'How do I place an order?',
          slug: 'how-do-i-place-an-order',
          content: 'Browse the products you want, open a product to review its details, and select Add to cart. Open your cart, confirm your delivery details and payment method, then select Place order. You will see an order confirmation when checkout is complete.',
          tags: 'orders,checkout,cart',
          order: 1,
        },
        {
          title: 'Which payment methods can I use?',
          slug: 'which-payment-methods-can-i-use',
          content: 'Available payment methods are shown during checkout and depend on your location and account. Select a saved payment method or add a new one, then confirm the payment before placing your order.',
          tags: 'payments,checkout,card',
          order: 2,
        },
        {
          title: 'How can I check my order status?',
          slug: 'how-can-i-check-my-order-status',
          content: 'Sign in and open Orders from the navigation menu. Select an order to view its status, items, delivery information, and the latest tracking updates.',
          tags: 'orders,tracking,status',
          order: 3,
        },
      ],
    },
    {
      name: 'Delivery and Shipping',
      slug: 'delivery-and-shipping',
      description: 'Information about delivery areas, shipping times, and tracking.',
      icon: 'truck',
      order: 2,
      articles: [
        {
          title: 'How long does delivery take?',
          slug: 'how-long-does-delivery-take',
          content: 'Estimated delivery times are shown at checkout and may vary by seller, destination, and product availability. You can see the latest estimate and tracking events from your order details page.',
          tags: 'delivery,shipping,tracking',
          order: 1,
        },
        {
          title: 'Can I change my delivery address?',
          slug: 'can-i-change-my-delivery-address',
          content: 'You can update an address before an order is submitted from your Addresses settings. After an order is placed, contact support as soon as possible; changes may not be possible once the package has been dispatched.',
          tags: 'delivery,address,shipping',
          order: 2,
        },
        {
          title: 'How do I track my delivery?',
          slug: 'how-do-i-track-my-delivery',
          content: 'Open Orders, select the relevant order, and choose Track order. The tracking page shows the current delivery status and available courier updates.',
          tags: 'tracking,delivery,courier',
          order: 3,
        },
      ],
    },
    {
      name: 'Returns and Refunds',
      slug: 'returns-and-refunds',
      description: 'Guidance for returns, cancellations, refunds, and order issues.',
      icon: 'refresh',
      order: 3,
      articles: [
        {
          title: 'How do I request a return?',
          slug: 'how-do-i-request-a-return',
          content: 'Open Orders, select the order, and choose Request return. Provide the reason and any requested details, then submit the request. The seller or support team will review it and provide the next steps.',
          tags: 'returns,orders,support',
          order: 1,
        },
        {
          title: 'When will I receive my refund?',
          slug: 'when-will-i-receive-my-refund',
          content: 'Refund timing depends on the return review and your payment provider. Once a refund is approved, it may take several business days to appear in your account. You can follow its status from the order details page.',
          tags: 'refunds,returns,payments',
          order: 2,
        },
        {
          title: 'What should I do if my order arrives damaged?',
          slug: 'what-should-i-do-if-my-order-arrives-damaged',
          content: 'Take clear photos of the package and damaged item, keep the packaging, and submit a return or support request from the order page as soon as possible. Include the order number and a description of the damage.',
          tags: 'damaged,returns,support',
          order: 3,
        },
      ],
    },
  ];

  for (const categoryData of faqCategories) {
    const { articles, ...categoryFields } = categoryData;
    const category = await prisma.faqCategory.upsert({
      where: { slug: categoryFields.slug },
      update: categoryFields,
      create: categoryFields,
    });

    for (const article of articles) {
      await prisma.faqArticle.upsert({
        where: { slug: article.slug },
        update: { ...article, categoryId: category.id, isPublished: true },
        create: { ...article, categoryId: category.id, isPublished: true },
      });
    }
  }

  console.log(`✅ Created ${faqCategories.length} FAQ categories with ${faqCategories.reduce((total, category) => total + category.articles.length, 0)} articles`);

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
