require("dotenv").config();
const mongoose = require("mongoose");
const Users = require("./models/user");
const Products = require("./models/product");
const Order = require("./models/order");
const Cart = require("./models/cart");
const Notification = require("./models/notification");

const MONGO_URL = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/jdmart1";

const demoUsers = [
  {
    fullName: "Demo Buyer",
    phone: "9876543210",
    email: "demo@jdmart.com",
    business: "Demo Trading Co",
    businessType: "Trader",
    password: "demo123",
    defaultAddress: "Demo Street, Mumbai, India",
    role: "admin"
  },
  {
    fullName: "Sample Retailer",
    phone: "9123456780",
    email: "retailer@jdmart.com",
    business: "Retail Hub",
    businessType: "Retailer",
    password: "demo123",
    defaultAddress: "Main Road, Pune, India"
  }
];

const demoProducts = [
  // ===== GRAINS =====
  {
    name: "Organic Wheat",
    category: "Grains",
    description: "Premium grade wheat for wholesale buyers with high protein content.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 2850,
    oldPrice: 3150,
    belowMarketPercent: 10,
    available: 120,
    images: [{ filename: "wheat.svg", url: "/images/products/wheat.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 4 }
  },
  {
    name: "Basmati Rice",
    category: "Grains",
    description: "Long grain rice with export quality sorting and aromatic flavor.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 5200,
    oldPrice: 5700,
    belowMarketPercent: 8,
    available: 90,
    images: [{ filename: "rice.svg", url: "/images/products/rice.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 5 }
  },
  {
    name: "Maize (Corn)",
    category: "Grains",
    description: "High-quality maize for feed and industrial use. Yellow hybrid variety.",
    grade: "B",
    demandLevel: "High",
    pricePerQuintal: 1950,
    oldPrice: 2200,
    belowMarketPercent: 11,
    available: 150,
    images: [{ filename: "maize.svg", url: "/images/products/maize.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 5 }
  },
  {
    name: "Parboiled Rice",
    category: "Grains",
    description: "Parboiled white rice with superior nutrition retention.",
    grade: "B",
    demandLevel: "High",
    pricePerQuintal: 3200,
    oldPrice: 3600,
    belowMarketPercent: 11,
    available: 95,
    images: [{ filename: "rice.svg", url: "/images/products/rice.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 5 }
  },
  {
    name: "Broken Rice",
    category: "Grains",
    description: "Economical broken rice for mass consumption and industry.",
    grade: "C",
    demandLevel: "Medium",
    pricePerQuintal: 1800,
    oldPrice: 2100,
    belowMarketPercent: 14,
    available: 200,
    images: [{ filename: "rice.svg", url: "/images/products/rice.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 4 }
  },

  // ===== PULSES =====
  {
    name: "Red Lentils (Masoor)",
    category: "Pulses",
    description: "Sorted red lentils with consistent moisture levels. Perfect for dal.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 6400,
    oldPrice: 6900,
    belowMarketPercent: 7,
    available: 65,
    images: [{ filename: "toor.svg", url: "/images/products/toor.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 5 }
  },
  {
    name: "Chickpea (Chana)",
    category: "Pulses",
    description: "Premium quality chickpeas for flour and whole grain use.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 5800,
    oldPrice: 6300,
    belowMarketPercent: 8,
    available: 80,
    images: [{ filename: "chana.svg", url: "/images/products/chana.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 6 }
  },
  {
    name: "Pigeon Pea (Toor Dal)",
    category: "Pulses",
    description: "High-quality pigeon peas with excellent cooking properties.",
    grade: "A",
    demandLevel: "Medium",
    pricePerQuintal: 7200,
    oldPrice: 7800,
    belowMarketPercent: 8,
    available: 55,
    images: [{ filename: "toor.svg", url: "/images/products/toor.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 6 }
  },
  {
    name: "Moong Dal (Green Gram)",
    category: "Pulses",
    description: "Whole and split green moong dal for cooking and sprouting.",
    grade: "B",
    demandLevel: "High",
    pricePerQuintal: 5400,
    oldPrice: 6000,
    belowMarketPercent: 10,
    available: 70,
    images: [{ filename: "chana.svg", url: "/images/products/chana.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 5 }
  },
  {
    name: "Black Chickpea (Kala Chana)",
    category: "Pulses",
    description: "Small black chickpeas with nutty flavor, perfect for snacks.",
    grade: "B",
    demandLevel: "Medium",
    pricePerQuintal: 6500,
    oldPrice: 7100,
    belowMarketPercent: 8,
    available: 45,
    images: [{ filename: "chana.svg", url: "/images/products/chana.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 7 }
  },

  // ===== OILSEEDS =====
  {
    name: "Mustard Seeds (Sarson)",
    category: "Oilseeds",
    description: "Premium mustard seeds for oil extraction and pickling.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 5200,
    oldPrice: 5600,
    belowMarketPercent: 7,
    available: 85,
    images: [{ filename: "groundnut.svg", url: "/images/products/groundnut.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 5 }
  },
  {
    name: "Groundnut (Peanuts)",
    category: "Oilseeds",
    description: "High-yield groundnuts with excellent oil content. Virginia variety.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 5900,
    oldPrice: 6400,
    belowMarketPercent: 8,
    available: 100,
    images: [{ filename: "groundnut.svg", url: "/images/products/groundnut.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 5 }
  },
  {
    name: "Soybean",
    category: "Oilseeds",
    description: "Premium quality soybean for oil extraction and livestock feed.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 5200,
    oldPrice: 5700,
    belowMarketPercent: 9,
    available: 110,
    images: [{ filename: "soybean.svg", url: "/images/products/soybean.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 2, maxDays: 4 }
  },
  {
    name: "Sunflower Seeds",
    category: "Oilseeds",
    description: "High oil-yielding sunflower seeds for commercial extraction.",
    grade: "B",
    demandLevel: "Medium",
    pricePerQuintal: 3800,
    oldPrice: 4200,
    belowMarketPercent: 10,
    available: 75,
    images: [{ filename: "groundnut.svg", url: "/images/products/groundnut.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 6 }
  },
  {
    name: "Sesame Seeds (Til)",
    category: "Oilseeds",
    description: "Premium white sesame seeds rich in oil content.",
    grade: "A",
    demandLevel: "Medium",
    pricePerQuintal: 8900,
    oldPrice: 9600,
    belowMarketPercent: 7,
    available: 40,
    images: [{ filename: "groundnut.svg", url: "/images/products/groundnut.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 4, maxDays: 7 }
  },

  // ===== SPICES =====
  {
    name: "Turmeric (Haldi)",
    category: "Spices",
    description: "Premium grade turmeric with high curcumin content. Organic certified.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 8500,
    oldPrice: 9200,
    belowMarketPercent: 8,
    available: 45,
    images: [{ filename: "turmeric.svg", url: "/images/products/turmeric.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 7 }
  },
  {
    name: "Coriander (Dhania)",
    category: "Spices",
    description: "Aromatic coriander seeds ideal for spice blends and cooking.",
    grade: "B",
    demandLevel: "Medium",
    pricePerQuintal: 7200,
    oldPrice: 7800,
    belowMarketPercent: 7,
    available: 50,
    images: [{ filename: "coriander.svg", url: "/images/products/coriander.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 6 }
  },
  {
    name: "Black Pepper (Kali Mirch)",
    category: "Spices",
    description: "Premium black pepper with intense flavor for global markets.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 12500,
    oldPrice: 13500,
    belowMarketPercent: 7,
    available: 35,
    images: [{ filename: "pepper.svg", url: "/images/products/pepper.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 4, maxDays: 8 }
  },
  {
    name: "Cumin (Jeera)",
    category: "Spices",
    description: "Whole cumin seeds with distinct aromatic profile.",
    grade: "A",
    demandLevel: "High",
    pricePerQuintal: 9800,
    oldPrice: 10500,
    belowMarketPercent: 7,
    available: 30,
    images: [{ filename: "coriander.svg", url: "/images/products/coriander.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 7 }
  },
  {
    name: "Fenugreek (Methi)",
    category: "Spices",
    description: "Dried fenugreek leaves and seeds with medicinal properties.",
    grade: "B",
    demandLevel: "Low",
    pricePerQuintal: 4500,
    oldPrice: 5000,
    belowMarketPercent: 10,
    available: 25,
    images: [{ filename: "coriander.svg", url: "/images/products/coriander.svg", uploadedAt: new Date() }],
    deliveryTime: { minDays: 3, maxDays: 6 }
  }
];

async function seed() {
  await mongoose.connect(MONGO_URL);

  await Promise.all([
    Users.deleteMany({}),
    Products.deleteMany({}),
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Notification.deleteMany({})
  ]);

  // Create users individually to trigger pre-save password hashing
  const createdUsers = [];
  for (const userData of demoUsers) {
    const user = new Users(userData);
    await user.save();
    createdUsers.push(user);
  }

  const products = await Products.insertMany(demoProducts);
  const users = createdUsers;

  // Verify password hashing
  const demoUser = users.find(u => u.email === "demo@jdmart.com");
  if (demoUser) {
    const passwordMatch = await demoUser.comparePassword("demo123");
    if (passwordMatch) {
      console.log("✅ Demo user password verified successfully!");
    }
  }

  // Create sample orders for demo user
  
  const sampleOrders = [
    {
      user: demoUser._id,
      items: [
        {
          product: products[0]._id,
          quantity: 5,
          priceAtOrder: 2850
        }
      ],
      totalAmount: 14250,
      deliveryAddress: "Demo Street, Mumbai, India",
      orderId: `ORD-${Date.now()}-001`,
      status: "Delivered",
      paymentMethod: "bank-transfer",
      timeline: [
        { status: "Placed", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { status: "Confirmed", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { status: "Processing", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
        { status: "In Transit", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { status: "Delivered", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      user: demoUser._id,
      items: [
        {
          product: products[1]._id,
          quantity: 3,
          priceAtOrder: 5200
        },
        {
          product: products[3]._id,
          quantity: 2,
          priceAtOrder: 6400
        }
      ],
      totalAmount: (3 * 5200) + (2 * 6400),
      deliveryAddress: "Demo Street, Mumbai, India",
      orderId: `ORD-${Date.now()}-002`,
      status: "In Transit",
      paymentMethod: "upi",
      timeline: [
        { status: "Placed", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { status: "Confirmed", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { status: "Processing", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { status: "In Transit", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      user: demoUser._id,
      items: [
        {
          product: products[2]._id,
          quantity: 10,
          priceAtOrder: 4600
        }
      ],
      totalAmount: 46000,
      deliveryAddress: "Demo Street, Mumbai, India",
      orderId: `ORD-${Date.now()}-003`,
      status: "Pending",
      paymentMethod: "cod",
      timeline: [
        { status: "Placed", timestamp: new Date() }
      ],
      createdAt: new Date()
    }
  ];

  const createdOrders = await Order.insertMany(sampleOrders);

  // Create sample notifications for order lifecycle
  const sampleNotifications = [
    {
      user: demoUser._id,
      title: "Order Delivered",
      message: "Your order ORD-1 has been successfully delivered. Thank you for shopping!",
      type: "delivery",
      relatedOrder: createdOrders[0]._id,
      read: true,
      readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: "fa-check-circle",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      user: demoUser._id,
      title: "Order Shipped",
      message: "Your order ORD-2 is on the way! Expected delivery in 2-3 days.",
      type: "delivery",
      relatedOrder: createdOrders[1]._id,
      read: true,
      readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      icon: "fa-truck",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      user: demoUser._id,
      title: "Order Confirmed",
      message: "Your order ORD-3 has been confirmed. We're processing it now.",
      type: "order",
      relatedOrder: createdOrders[2]._id,
      read: false,
      icon: "fa-check",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      user: demoUser._id,
      title: "Low Stock Alert",
      message: "Red Lentils stock is running low. Only 5 units available.",
      type: "promotion",
      read: false,
      icon: "fa-exclamation-triangle",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      user: demoUser._id,
      title: "New Premium Wheat Available",
      message: "Check out our newly listed premium wheat variety - 15% discount for bulk orders!",
      type: "promotion",
      read: false,
      icon: "fa-star",
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    }
  ];

  await Notification.insertMany(sampleNotifications);

  console.log("Seed completed successfully.");
  console.log(`Users: ${users.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Orders: ${createdOrders.length}`);
  console.log(`Notifications: ${sampleNotifications.length}`);
  console.log("");
  console.log("Demo User: demo@jdmart.com / demo123");
  console.log("Admin Role: Enabled");
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
