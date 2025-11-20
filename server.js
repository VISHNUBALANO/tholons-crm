// server.js
require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ------------------------------
// MIDDLEWARE
// ------------------------------
app.use(cors());
app.use(express.json({ limit: "10mb" })); // allow JD file data, etc.
app.use(express.urlencoded({ extended: true }));

// Serve all static files from project folder (login.html, partners.html, etc.)
app.use(express.static(path.join(__dirname)));

// Default route -> login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// Simple health check
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Tholons CRM backend is running" });
});

// ------------------------------
// MONGODB CONNECTION
// ------------------------------
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set in environment variables");
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// SCHEMAS & MODELS
// ------------------------------

// Partner collection (so Add Partner works even before any client is added)
const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  { timestamps: true }
);

const Partner = mongoose.model("Partner", partnerSchema);

// Requirement + Candidate subdocs for future use / compatibility
const candidateSchema = new mongoose.Schema(
  {
    candidateName: String,
    position: String,
    yearsOfExp: String,
    currentSalary: String,
    expectedSalary: String,
    marketSalary: String,
    clientSalary: String,
    hiringCostH2E: String,
    costToClientC2C: String,
    hourlyRate: String
  },
  { _id: false }
);

const requirementSchema = new mongoose.Schema(
  {
    roleName: String,
    numRequirements: String,
    yearsOfExp: String,
    location: String,
    typeOfPosition: String,
    contractDuration: String,
    startDate: String,
    numResumeSources: String,
    numShortlistedResumes: String,
    onedriveLink: String,
    notes: String,
    jobDescriptionFileName: String,
    jobDescriptionFileDataUrl: String,
    candidates: [candidateSchema]
  },
  { _id: false }
);

// Main client schema
const clientSchema = new mongoose.Schema(
  {
    partnerName: { type: String, required: true }, // "Addision", "Mondo", etc.
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
    requirements: [requirementSchema]
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);

// ------------------------------
// API ROUTES
// ------------------------------

/**
 * GET /api/partners
 * Returns list of partner names.
 * 1. Try Partner collection
 * 2. If empty, fall back to distinct partnerName from Client collection
 */
app.get("/api/partners", async (req, res) => {
  try {
    const partnerDocs = await Partner.find({}).sort({ name: 1 });

    if (partnerDocs.length > 0) {
      const names = partnerDocs.map((p) => p.name);
      return res.json(names);
    }

    // Fallback: derive from clients if Partner collection empty
    const distinctNames = await Client.distinct("partnerName");
    res.json(distinctNames.sort());
  } catch (err) {
    console.error("Error fetching partners:", err);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

/**
 * POST /api/partners
 * Body: { name: "Addision" }
 * Used by "Add Partner" button
 */
app.post("/api/partners", async (req, res) => {
  try {
    let { name } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Partner name is required" });
    }
    name = name.trim();
    if (!name) {
      return res.status(400).json({ error: "Partner name cannot be empty" });
    }

    // Upsert style: create if not exists
    let partner = await Partner.findOne({ name });
    if (!partner) {
      partner = await Partner.create({ name });
    }

    res.status(201).json({ ok: true, name: partner.name });
  } catch (err) {
    console.error("Error creating partner:", err);
    if (err.code === 11000) {
      // duplicate
      return res.status(409).json({ error: "Partner already exists" });
    }
    res.status(500).json({ error: "Failed to create partner" });
  }
});

/**
 * GET /api/clients/:partnerName
 * Returns clients for a specific partner
 */
app.get("/api/clients/:partnerName", async (req, res) => {
  try {
    const { partnerName } = req.params;
    const clients = await Client.find({ partnerName }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

/**
 * POST /api/clients/:partnerName
 * Creates a new client row for that partner.
 * Body matches what script.js sends from the Add Client form.
 */
app.post("/api/clients/:partnerName", async (req, res) => {
  try {
    const { partnerName } = req.params;
    const payload = req.body || {};

    if (!partnerName || !partnerName.trim()) {
      return res.status(400).json({ error: "partnerName is required" });
    }

    // Ensure partner exists in Partner collection too
    await Partner.updateOne(
      { name: partnerName },
      { $setOnInsert: { name: partnerName } },
      { upsert: true }
    );

    const doc = await Client.create({
      partnerName: partnerName.trim(),
      startDate: payload.startDate || "",
      client: payload.client || "",
      spoc: payload.spoc || "",
      location: payload.location || "",
      roles: payload.roles || "",
      engagement: payload.engagement || "",
      engagementOther: payload.engagementOther || "",
      currentStatus: payload.currentStatus || "",
      status: payload.status || "",
      nextSteps: payload.nextSteps || "",
      details: payload.details || "",
      requirements: payload.requirements || []
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

/**
 * PUT /api/clients/:id
 * Update existing client (used if script.js sends a full updated row)
 */
app.put("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const updated = await Client.findByIdAndUpdate(
      id,
      {
        $set: {
          startDate: payload.startDate || "",
          client: payload.client || "",
          spoc: payload.spoc || "",
          location: payload.location || "",
          roles: payload.roles || "",
          engagement: payload.engagement || "",
          engagementOther: payload.engagementOther || "",
          currentStatus: payload.currentStatus || "",
          status: payload.status || "",
          nextSteps: payload.nextSteps || "",
          details: payload.details || "",
          // if you want to update requirements as well, uncomment:
          // requirements: payload.requirements || []
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete a client row
 */
app.delete("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Client.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// ------------------------------
// START SERVER
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
