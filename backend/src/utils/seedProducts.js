// ==============================
// FILE: src/seeders/seedProducts.js
// ==============================
const { sequelize, Product } = require("../models");

const seedProducts = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    const products = [
      { name: "LED TV 42\"", plant: "Bangalore", stock: 25, uom: "unit" },
      { name: "Refrigerator 260L", plant: "Pune", stock: 15, uom: "unit" },
      { name: "Washing Machine 7kg", plant: "Mumbai", stock: 10, uom: "unit" },
      { name: "Air Conditioner 1.5T", plant: "Chennai", stock: 20, uom: "unit" },
      { name: "Microwave Oven", plant: "Delhi", stock: 18, uom: "unit" },
    ];

    await Product.bulkCreate(products, { ignoreDuplicates: true });
    console.log("✅ Product seed completed!");
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    await sequelize.close();
    process.exit(1);
  }
};

if (require.main === module) {
  seedProducts();
}
