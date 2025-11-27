// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// -------------------------
// ENV + CONFIG
// -------------------------
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "TholonsCRM";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set. Check Render Environment variables.");
}

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(
  cors({
    origin: true,
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, JS, logo)
app.use(express.static(path.join(__dirname)));

// -------------------------
// MONGOOSE SETUP
// -------------------------
mongoose
  .connect(MONGODB_URI, { dbName: MONGODB_DB })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

const Schema = mongoose.Schema;

// Partner
const partnerSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);
const Partner = mongoose.model("Partner", partnerSchema);

// Applications embedded schema
const applicationSchema = new Schema(
  {
    name: String,
    exp: String,
    work: String,
    current: String,
    expected: String,
    date: String,
    time: String,
    r1: String,
    r2: String,
    r3: String,
    r4: String,
    final: String,
  },
  { _id: false }
);

// Candidate embedded schema
const candidateSchema = new Schema(
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
    hourlyRate: String,
  },
  { _id: false }
);

// Requirement embedded schema
const requirementSchema = new Schema(
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
    candidates: [candidateSchema],
    applications: [applicationSchema], // track-application per requirement if you want
  },
  { _id: false }
);

// Client main schema
const clientSchema = new Schema(
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
    requirements: [requirementSchema],
  },
  { timestamps: true }
);
const Client = mongoose.model("Client", clientSchema);

// -------------------------
// HEALTH CHECK
// -------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Tholons CRM backend is running" });
});

// -------------------------
// PARTNERS API
// -------------------------

// GET all partners
app.get("/api/partners", async (req, res) => {
  try {
    const partners = await Partner.find().sort({ name: 1 }).lean();
    if (!partners.length) {
      // seed defaults once
      const defaults = ["Addision", "Mondo", "Arc Light"];
      const docs = await Partner.insertMany(
        defaults.map((n) => ({ name: n }))
      );
      return res.json(docs);
    }
    res.json(partners);
  } catch (err) {
    console.error("Error fetching partners:", err);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

// POST create partner
app.post("/api/partners", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Partner name is required" });
    }

    let existing = await Partner.findOne({ name });
    if (existing) {
      return res.status(200).json(existing);
    }

    const partner = new Partner({ name });
    await partner.save();
    res.status(201).json(partner);
  } catch (err) {
    console.error("Error creating partner:", err);
    res.status(500).json({ error: "Failed to create partner" });
  }
});

// -------------------------
// CLIENTS API
// -------------------------

// GET all clients for a partner
app.get("/api/clients/:partnerName", async (req, res) => {
  try {
    const partnerName = req.params.partnerName;
    const clients = await Client.find({ partnerName })
      .sort({ createdAt: -1 })
      .lean();
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// POST create client
app.post("/api/clients/:partnerName", async (req, res) => {
  try {
    const partnerName = req.params.partnerName;

    const clientDoc = new Client({
      partnerName,
      startDate: req.body.startDate || "",
      client: req.body.client || "",
      spoc: req.body.spoc || "",
      location: req.body.location || "",
      roles: req.body.roles || "",
      engagement: req.body.engagement || "",
      engagementOther: req.body.engagementOther || "",
      currentStatus: req.body.currentStatus || "",
      status: req.body.status || "",
      nextSteps: req.body.nextSteps || "",
      details: req.body.details || "",
      requirements: [],
    });

    await clientDoc.save();
    res.status(201).json(clientDoc);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// PUT update client (used when editing row or requirements)
app.put("/api/clients/:clientId", async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const update = req.body || {};
    const updated = await Client.findByIdAndUpdate(clientId, update, {
      new: true,
    }).lean();
    res.json(updated);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// DELETE client
app.delete("/api/clients/:clientId", async (req, res) => {
  try {
    const clientId = req.params.clientId;
    await Client.findByIdAndDelete(clientId);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// -------------------------
// APPLICATION TRACKER PER REQUIREMENT
// -------------------------

// GET applications for a requirement
app.get(
  "/api/applications/:partnerName/:clientId/:reqIndex",
  async (req, res) => {
    try {
      const { clientId, reqIndex } = req.params;
      const client = await Client.findById(clientId).lean();
      if (!client) return res.status(404).json({ error: "Client not found" });

      const idx = parseInt(reqIndex, 10);
      if (
        Number.isNaN(idx) ||
        !client.requirements ||
        !client.requirements[idx]
      ) {
        return res.status(404).json({ error: "Requirement not found" });
      }

      const apps = client.requirements[idx].applications || [];
      res.json(apps);
    } catch (err) {
      console.error("Error fetching applications:", err);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  }
);

// POST save applications array for a requirement
app.post(
  "/api/applications/:partnerName/:clientId/:reqIndex",
  async (req, res) => {
    try {
      const { clientId, reqIndex } = req.params;
      const apps = Array.isArray(req.body.applications)
        ? req.body.applications
        : [];

      const client = await Client.findById(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const idx = parseInt(reqIndex, 10);
      if (
        Number.isNaN(idx) ||
        !client.requirements ||
        !client.requirements[idx]
      ) {
        return res.status(404).json({ error: "Requirement not found" });
      }

      client.requirements[idx].applications = apps;
      await client.save();
      res.json({ ok: true });
    } catch (err) {
      console.error("Error saving applications:", err);
      res.status(500).json({ error: "Failed to save applications" });
    }
  }
);

// -------------------------
// FALLBACK ROUTE FOR HTML
// IMPORTANT: Express 5 requires '/*' not '*'
// -------------------------
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// -------------------------
// START SERVER
// -------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
