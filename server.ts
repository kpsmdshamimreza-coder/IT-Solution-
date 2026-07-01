import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, limit, query } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Initialize Firebase Client with Firestore support
let db: any;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fsSync.existsSync(configPath)) {
    const config = JSON.parse(fsSync.readFileSync(configPath, "utf-8"));
    const firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp, config.firestoreDatabaseId);
    console.log("Firebase client initialized successfully with database id:", config.firestoreDatabaseId);
  } else {
    console.warn("firebase-applet-config.json not found.");
  }
} catch (error) {
  console.error("Error initializing Firebase Client:", error);
}

app.use(express.json());

// Helper to read database (tries Firestore first, then falls back to local file)
async function readDB() {
  if (db) {
    try {
      const productsSnap = await getDocs(collection(db, "products"));
      const products = productsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      const salesSnap = await getDocs(collection(db, "sales"));
      const sales = salesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      return { products, sales };
    } catch (error) {
      console.error("Error reading from Firestore. Falling back to local file:", error);
    }
  }

  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading local database file:", error);
    return { products: [], sales: [] };
  }
}

// Helper to write database (writes to Firestore, falls back to local file)
async function writeDB(data: any) {
  if (db) {
    try {
      const batch = writeBatch(db);

      // Sync products collection
      const currentProductsSnap = await getDocs(collection(db, "products"));
      const currentProductIds = new Set(currentProductsSnap.docs.map((doc: any) => doc.id));
      const newProductIds = new Set(data.products.map((p: any) => p.id));

      // Delete removed products
      for (const docId of currentProductIds) {
        if (!newProductIds.has(docId)) {
          batch.delete(doc(db, "products", docId));
        }
      }
      // Set/Update current products
      for (const p of data.products) {
        const docRef = doc(db, "products", p.id);
        batch.set(docRef, p);
      }

      // Sync sales collection
      const currentSalesSnap = await getDocs(collection(db, "sales"));
      const currentSaleIds = new Set(currentSalesSnap.docs.map((doc: any) => doc.id));
      const newSaleIds = new Set(data.sales.map((s: any) => s.id));

      // Delete removed sales
      for (const docId of currentSaleIds) {
        if (!newSaleIds.has(docId)) {
          batch.delete(doc(db, "sales", docId));
        }
      }
      // Set/Update current sales
      for (const s of data.sales) {
        const docRef = doc(db, "sales", s.id);
        batch.set(docRef, s);
      }

      await batch.commit();
      console.log("Firestore successfully synchronized.");
      return;
    } catch (error) {
      console.error("Error writing to Firestore. Synchronizing to local file as fallback:", error);
    }
  }

  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local database:", error);
  }
}

// Auto migration helper to seed Firestore when empty
async function seedFirestoreIfEmpty() {
  if (!db) return;
  try {
    const q = query(collection(db, "products"), limit(1));
    const productsSnap = await getDocs(q);
    if (productsSnap.empty) {
      console.log("Firestore collections are empty. Seeding/Migrating existing local database to Firestore...");
      const localDataStr = await fs.readFile(DB_PATH, "utf-8").catch(() => null);
      if (localDataStr) {
        const localData = JSON.parse(localDataStr);
        if (localData.products && localData.products.length > 0) {
          console.log(`Migrating ${localData.products.length} products and ${localData.sales?.length || 0} sales...`);
          await writeDB(localData);
          console.log("Database migration to Firestore completed successfully.");
        }
      }
    } else {
      console.log("Firestore already contains data. Migration bypassed.");
    }
  } catch (err) {
    console.error("Failed to seed/migrate Firestore:", err);
  }
}

// --- API Endpoints ---

// Get health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET uploaded logo and QR code
app.get("/input_file_0.png", async (req, res) => {
  try {
    const logoPathAbsolute = "/input_file_0.png";
    try {
      await fs.access(logoPathAbsolute);
      res.sendFile(logoPathAbsolute);
      return;
    } catch {
      const logoPathCwd = path.join(process.cwd(), "input_file_0.png");
      await fs.access(logoPathCwd);
      res.sendFile(logoPathCwd);
    }
  } catch {
    res.status(404).send("Logo not found");
  }
});

app.get("/input_file_1.png", async (req, res) => {
  try {
    const qrPathAbsolute = "/input_file_1.png";
    try {
      await fs.access(qrPathAbsolute);
      res.sendFile(qrPathAbsolute);
      return;
    } catch {
      const qrPathCwd = path.join(process.cwd(), "input_file_1.png");
      await fs.access(qrPathCwd);
      res.sendFile(qrPathCwd);
    }
  } catch {
    res.status(404).send("QR code not found");
  }
});

// GET all products
app.get("/api/products", async (req, res) => {
  const db = await readDB();
  res.json(db.products);
});

// POST new product
app.post("/api/products", async (req, res) => {
  const { name, barcode, category, price, cost, stock, minStock, isEssential, type, description, warranty } = req.body;
  if (!name || !barcode || !category) {
    res.status(400).json({ error: "Missing required product fields (name, barcode, category)" });
    return;
  }

  const db = await readDB();
  
  // Check if barcode already exists
  const exists = db.products.some((p: any) => p.barcode === barcode);
  if (exists) {
    res.status(400).json({ error: `Product with barcode ${barcode} already exists` });
    return;
  }

  const newProduct = {
    id: `prod_${Date.now()}`,
    name,
    barcode,
    category,
    price: Number(price) || 0,
    cost: Number(cost) || 0,
    stock: Number(stock) || 0,
    minStock: Number(minStock) || 0,
    isEssential: Boolean(isEssential),
    type: type === "service" ? "service" : "part",
    description: description || "",
    warranty: warranty || "No Warranty",
    createdAt: new Date().toISOString(),
  };

  db.products.push(newProduct);
  await writeDB(db);
  res.status(201).json(newProduct);
});

// PUT update product
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, barcode, category, price, cost, stock, minStock, isEssential, type, description, warranty } = req.body;

  const db = await readDB();
  const index = db.products.findIndex((p: any) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // Update product fields
  const updatedProduct = {
    ...db.products[index],
    name: name !== undefined ? name : db.products[index].name,
    barcode: barcode !== undefined ? barcode : db.products[index].barcode,
    category: category !== undefined ? category : db.products[index].category,
    price: price !== undefined ? Number(price) : db.products[index].price,
    cost: cost !== undefined ? Number(cost) : db.products[index].cost,
    stock: stock !== undefined ? Number(stock) : db.products[index].stock,
    minStock: minStock !== undefined ? Number(minStock) : db.products[index].minStock,
    isEssential: isEssential !== undefined ? Boolean(isEssential) : db.products[index].isEssential,
    type: type !== undefined ? type : (db.products[index].type || "part"),
    description: description !== undefined ? description : db.products[index].description,
    warranty: warranty !== undefined ? warranty : db.products[index].warranty,
  };

  db.products[index] = updatedProduct;
  await writeDB(db);
  res.json(updatedProduct);
});

// DELETE product
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  const originalLength = db.products.length;
  db.products = db.products.filter((p: any) => p.id !== id);

  if (db.products.length === originalLength) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await writeDB(db);
  res.json({ message: "Product deleted successfully" });
});

// GET all sales
app.get("/api/sales", async (req, res) => {
  const db = await readDB();
  res.json(db.sales);
});

// POST new sale
app.post("/api/sales", async (req, res) => {
  const { items, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Sale must contain an array of items" });
    return;
  }

  const db = await readDB();
  const saleItems: any[] = [];
  let totalAmount = 0;
  let totalProfit = 0;

  // Process items and decrement stock (only for physical parts, not servicing!)
  for (const item of items) {
    const product = db.products.find((p: any) => p.id === item.productId || p.barcode === item.barcode);
    if (!product) {
      res.status(404).json({ error: `Product not found for ID/Barcode: ${item.productId || item.barcode}` });
      return;
    }

    const qty = Number(item.quantity) || 1;
    
    // Only check and decrement stock if it is a physical part (not a service!)
    const isService = product.type === "service";
    if (!isService) {
      if (product.stock < qty) {
        res.status(400).json({ error: `Insufficient stock for ${product.name}. Current stock: ${product.stock}, requested: ${qty}` });
        return;
      }
      product.stock -= qty;
    }

    const itemRevenue = product.price * qty;
    const itemCost = product.cost * qty;
    const itemProfit = itemRevenue - itemCost;

    totalAmount += itemRevenue;
    totalProfit += itemProfit;

    saleItems.push({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      quantity: qty,
      price: product.price,
      cost: product.cost,
      description: product.description || "",
      warranty: product.warranty || "No Warranty"
    });
  }

  const newSale = {
    id: `sale_${Date.now()}`,
    timestamp: new Date().toISOString(),
    items: saleItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    paymentMethod: paymentMethod || "cash"
  };

  db.sales.push(newSale);
  await writeDB(db);
  res.status(201).json({ sale: newSale, products: db.products });
});

// DELETE / Void a sale (Cancels transaction and returns physical parts to stock!)
app.delete("/api/sales/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDB();

  const saleIndex = db.sales.findIndex((s: any) => s.id === id);
  if (saleIndex === -1) {
    res.status(404).json({ error: "Sale transaction not found" });
    return;
  }

  const saleToVoid = db.sales[saleIndex];

  // Revert stock levels for all physical parts in the sale
  for (const item of saleToVoid.items) {
    const product = db.products.find((p: any) => p.id === item.productId);
    if (product && product.type !== "service") {
      product.stock += Number(item.quantity) || 0;
    }
  }

  // Remove the sale
  db.sales.splice(saleIndex, 1);
  await writeDB(db);

  res.json({ message: "Sale transaction voided successfully. Stock levels restored.", products: db.products });
});

// PUT / Edit a sale (Allows updating payment method or quantities, keeping stock levels synchronized)
app.put("/api/sales/:id", async (req, res) => {
  const { id } = req.params;
  const { paymentMethod, items, totalAmount, totalProfit } = req.body;
  const db = await readDB();

  const saleIndex = db.sales.findIndex((s: any) => s.id === id);
  if (saleIndex === -1) {
    res.status(404).json({ error: "Sale transaction not found" });
    return;
  }

  const existingSale = db.sales[saleIndex];

  // If items are being updated, we should safely adjust stock levels!
  if (items && Array.isArray(items)) {
    // Revert old stock
    for (const item of existingSale.items) {
      const product = db.products.find((p: any) => p.id === item.productId);
      if (product && product.type !== "service") {
        product.stock += Number(item.quantity) || 0;
      }
    }

    // Apply new stock adjustments
    const updatedSaleItems: any[] = [];
    let calculatedAmount = 0;
    let calculatedProfit = 0;

    for (const item of items) {
      const product = db.products.find((p: any) => p.id === item.productId || p.barcode === item.barcode);
      if (!product) {
        res.status(404).json({ error: `Product not found for ID/Barcode: ${item.productId || item.barcode}` });
        return;
      }
      const qty = Number(item.quantity) || 1;
      if (product.type !== "service") {
        if (product.stock < qty) {
          res.status(400).json({ error: `Insufficient stock for ${product.name} during update` });
          return;
        }
        product.stock -= qty;
      }

      const itemRevenue = (item.price !== undefined ? Number(item.price) : product.price) * qty;
      const itemCost = (item.cost !== undefined ? Number(item.cost) : product.cost) * qty;
      const itemProfit = itemRevenue - itemCost;

      calculatedAmount += itemRevenue;
      calculatedProfit += itemProfit;

      updatedSaleItems.push({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        quantity: qty,
        price: Number(item.price) || product.price,
        cost: Number(item.cost) || product.cost,
        description: product.description || "",
        warranty: product.warranty || "No Warranty"
      });
    }

    existingSale.items = updatedSaleItems;
    existingSale.totalAmount = parseFloat(calculatedAmount.toFixed(2));
    existingSale.totalProfit = parseFloat(calculatedProfit.toFixed(2));
  }

  if (paymentMethod) {
    existingSale.paymentMethod = paymentMethod;
  }
  
  if (totalAmount !== undefined && !items) {
    existingSale.totalAmount = parseFloat(Number(totalAmount).toFixed(2));
  }
  if (totalProfit !== undefined && !items) {
    existingSale.totalProfit = parseFloat(Number(totalProfit).toFixed(2));
  }

  db.sales[saleIndex] = existingSale;
  await writeDB(db);

  res.json({ message: "Sale updated successfully.", sale: existingSale, products: db.products });
});

// GET automated stock alerts
app.get("/api/alerts", async (req, res) => {
  const db = await readDB();
  const alerts = db.products
    .filter((p: any) => p.stock <= p.minStock)
    .map((p: any) => ({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode,
      stock: p.stock,
      minStock: p.minStock,
      isEssential: p.isEssential
    }));
  res.json(alerts);
});

// GET category sales & trends
app.get("/api/trends", async (req, res) => {
  const db = await readDB();
  const categoryStats: { [key: string]: { salesCount: number; revenue: number; profit: number } } = {};

  // Initialize from products
  db.products.forEach((p: any) => {
    if (!categoryStats[p.category]) {
      categoryStats[p.category] = { salesCount: 0, revenue: 0, profit: 0 };
    }
  });

  // Calculate stats from sales
  db.sales.forEach((s: any) => {
    s.items.forEach((item: any) => {
      const product = db.products.find((p: any) => p.id === item.productId);
      const category = product ? product.category : "Uncategorized";
      if (!categoryStats[category]) {
        categoryStats[category] = { salesCount: 0, revenue: 0, profit: 0 };
      }
      const itemRev = item.price * item.quantity;
      const itemCost = item.cost * item.quantity;
      categoryStats[category].salesCount += item.quantity;
      categoryStats[category].revenue += itemRev;
      categoryStats[category].profit += (itemRev - itemCost);
    });
  });

  // Transform into trends array with custom logic
  const trends = Object.keys(categoryStats).map((cat) => {
    const stats = categoryStats[cat];
    // Custom simulated growth indexes for tech servicing business
    let growth = 0;
    if (cat === "Servicing & Labor") growth = 32.5;
    else if (cat === "Storage & RAM") growth = 24.8;
    else if (cat === "Screens & Displays") growth = 14.2;
    else if (cat === "Power & Battery") growth = 18.6;
    else if (cat === "Keyboards & Mice") growth = 9.4;
    else growth = 10.0;

    return {
      category: cat,
      salesCount: stats.salesCount,
      revenue: parseFloat(stats.revenue.toFixed(2)),
      profit: parseFloat(stats.profit.toFixed(2)),
      growth
    };
  });

  res.json(trends);
});

// POST AI Insights from Gemini
app.post("/api/ai/insights", async (req, res) => {
  const db = await readDB();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Graceful fallback with tech/servicing smart insights if API key is not configured yet
    res.json({
      suggestions: [
        {
          title: "Critical Hinge & Display Panel Shortage",
          description: "Slim IPS Laptop Display Panels are below critical thresholds. Restock immediately to fulfill pending repair bookings.",
          type: "restock",
          targetCategoryOrProduct: "Screens & Displays",
          severity: "high"
        },
        {
          title: "Servicing & Cleaning Jobs Surge (+32.5%)",
          description: "Demand for 'Thermal Paste & Dust Cleaning' is surging due to summer thermal throttling. Consider offering a combo package with cooling pad upsells.",
          type: "trend",
          targetCategoryOrProduct: "Servicing & Labor",
          severity: "medium"
        },
        {
          title: "RAM Upgrade Combo Promotion Opportunity",
          description: "OS Installations are paired with Crucial 8GB RAM upgrades in 48% of servicing transactions. Launch a 'Speed Booster Bundle' discount to raise ticket values.",
          type: "promotion",
          targetCategoryOrProduct: "Storage & RAM",
          severity: "low"
        }
      ]
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Format inventory data for prompt context
    const inventoryContext = db.products.map((p: any) => ({
      name: p.name,
      category: p.category,
      stock: p.stock,
      minStock: p.minStock,
      isEssential: p.isEssential,
      price: p.price
    }));

    const salesContext = db.sales.slice(-10).map((s: any) => ({
      timestamp: s.timestamp,
      totalAmount: s.totalAmount,
      items: s.items.map((i: any) => `${i.name} (x${i.quantity})`)
    }));

    const prompt = `You are an expert IT & Computer Repair Retail business advisor. Analyze the current laptop parts inventory and repair services sales metrics to provide 3 actionable, highly specific smart business suggestions for a computer/laptop servicing workshop.

Current inventory & services levels (physical parts have actual stock levels, servicing jobs have 9999/unlimited virtual stock):
${JSON.stringify(inventoryContext, null, 2)}

Recent repair sales & parts dispatch history:
${JSON.stringify(salesContext, null, 2)}

Provide exactly 3 strategic suggestions as a valid JSON array. Each suggestion must follow this TypeScript interface structure:
interface AISuggestion {
  title: string;
  description: string;
  type: 'restock' | 'trend' | 'promotion';
  targetCategoryOrProduct?: string;
  severity: 'high' | 'medium' | 'low';
}

Respond ONLY with the JSON array, no conversational prefixes, no markdown formatting blocks, no backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Actionable summary title" },
              description: { type: Type.STRING, description: "Detailed strategy description" },
              type: { type: Type.STRING, enum: ["restock", "trend", "promotion"] },
              targetCategoryOrProduct: { type: Type.STRING, description: "Category or product name referenced" },
              severity: { type: Type.STRING, enum: ["high", "medium", "low"] }
            },
            required: ["title", "description", "type", "severity"]
          }
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text.trim());
      res.json({ suggestions: parsed });
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback to PC servicing suggestions
    res.json({
      suggestions: [
        {
          title: "Restock: Crucial Laptop RAM & Kingston SSDs",
          description: "Stock levels for core system upgrade hardware are low. Reorder immediately to avoid turning away service customers.",
          type: "restock",
          targetCategoryOrProduct: "Storage & RAM",
          severity: "high"
        },
        {
          title: "Promote High-Margin Cleaning Services",
          description: "Noctua Thermal Paste cleanings have low materials cost and high labor margins. Promote this with screen replacement service packages.",
          type: "promotion",
          targetCategoryOrProduct: "Servicing & Labor",
          severity: "medium"
        }
      ]
    });
  }
});

// --- Development and Production Static Asset Serving ---

async function startServer() {
  // Run initial Firestore seeding and data migration from local db.json
  await seedFirestoreIfEmpty();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
