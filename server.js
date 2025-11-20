// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Render gives PORT, localhost uses 3000
const PORT = process.env.PORT || 3000;

// Atlas connection string + DB name from env
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "TholonsCRM";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set. Check Render Environment Variables.");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, JS, CSS, logo)
app.use(express.static(path.join(__dirname)));

// ---------- Mongo connection ----------
mongoose
  .connect(MONGODB_URI, {
    dbName: DB_NAME
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ---------- Schemas ----------
const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

const clientSchema = new mongoose.Schema(
  {
    partnerName: { type: String, required: true, index: true },
    startDate: String,
    client: String,
    spoc: String,
    location: String,
    roles: String,
    engagement: String,
    engagementOther: String,
    currentStatus: String,
    status: String,
    nextSteps: String,
    details: String,
    requirements: {
      type: Array,
      default: []
    }
  },
  { timestamps: true }
);

const Partner = mongoose.model("Partner", partnerSchema);
const Client = mongoose.model("Client", clientSchema);

// ---------- Health check ----------
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Tholons CRM backend is running" });
});

// ---------- API ROUTES ----------

// Get all partners
app.get("/api/partners", async (req, res) => {
  try {
    const partners = await Partner.find().sort({ name: 1 });
    res.json(partners);
  } catch (err) {
    console.error("Error fetching partners:", err);
    res.status(500).json({ error: "Server error fetching partners" });
  }
});

// Create partner if not exists
app.post("/api/partners", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Partner name is required" });
    }

    let partner = await Partner.findOne({ name: name.trim() });
    if (!partner) {
      partner = await Partner.create({ name: name.trim() });
    }

    res.status(201).json(partner);
  } catch (err) {
    console.error("Error creating partner:", err);
    res.status(500).json({ error: "Server error creating partner" });
  }
});

// Get clients for a partner
app.get("/api/clients/:partnerName", async (req, res) => {
  try {
    const { partnerName } = req.params;
    const clients = await Client.find({ partnerName }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Server error fetching clients" });
  }
});

// Create a client row for a partner
app.post("/api/clients/:partnerName", async (req, res) => {
  try {
    const { partnerName } = req.params;
    const body = req.body || {};

    const clientDoc = await Client.create({
      partnerName,
      startDate: body.startDate || "",
      client: body.client || "",
      spoc: body.spoc || "",
      location: body.location || "",
      roles: body.roles || "",
      engagement: body.engagement || "",
      engagementOther: body.engagementOther || "",
      currentStatus: body.currentStatus || "",
      status: body.status || "",
      nextSteps: body.nextSteps || "",
      details: body.details || "",
      requirements: body.requirements || []
    });

    res.status(201).json(clientDoc);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Server error creating client" });
  }
});

// Fallback – always send login page
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
