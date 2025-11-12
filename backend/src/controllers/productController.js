const { Product } = require("../models");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [["name", "ASC"]],
    });
    res.json({ products });
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};
