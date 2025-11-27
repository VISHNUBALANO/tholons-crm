// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// -----------------------------------------------------
// Basic middleware
// -----------------------------------------------------
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Serve static files (HTML, JS, images) from project root
app.use(express.static(__dirname));

// -----------------------------------------------------
// MongoDB connection
// -----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "TholonsCRM";
const PORT = process.env.PORT || 3000;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Check Render Environment Variables.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    dbName: MONGODB_DB,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// -----------------------------------------------------
// Mongoose Schemas and Models
// -----------------------------------------------------

// Candidates inside a requirement
const CandidateSchema = new mongoose.Schema(
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

// Requirements inside a client
const RequirementSchema = new mongoose.Schema(
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
    candidates: [CandidateSchema],
  },
  { _id: false }
);

// Client document
const ClientSchema = new mongoose.Schema(
  {
    partnerName: { type: String, required: true },
    startDate: String,
    client: { type: String, required: true },
    spoc: String,
    location: String,
    roles: String,
    engagement: String,
    engagementOther: String,
    currentStatus: String,
    status: String,
    nextSteps: String,
    details: String,
    requirements: [RequirementSchema],
  },
  { timestamps: true }
);

// Partner document
const PartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Partner = mongoose.model("Partner", PartnerSchema);
const Client = mongoose.model("Client", ClientSchema);

// Seed default partners once
async function ensureDefaultPartners() {
  const defaults = ["Addision", "Mondo", "Arc Light"];
  for (const name of defaults) {
    await Partner.updateOne({ name }, { name }, { upsert: true });
  }
}
ensureDefaultPartners().catch((e) =>
  console.error("Error seeding default partners:", e)
);

// -----------------------------------------------------
// Routes
// -----------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Tholons CRM backend is running" });
});

// -------------------- PARTNERS -----------------------

// Get all partners
app.get("/api/partners", async (req, res) => {
  try {
    const partners = await Partner.find().sort({ name: 1 }).lean();
    res.json(partners);
  } catch (err) {
    console.error("Error fetching partners:", err);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

// Create partner
app.post("/api/partners", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Partner name is required" });
    }

    const trimmed = name.trim();

    let existing = await Partner.findOne({ name: trimmed });
    if (existing) {
      return res.status(200).json(existing);
    }

    const partner = await Partner.create({ name: trimmed });
    res.status(201).json(partner);
  } catch (err) {
    console.error("Error creating partner:", err);
    res.status(500).json({ error: "Failed to create partner" });
  }
});

// -------------------- CLIENTS ------------------------

// Get all clients for a partner
app.get("/api/clients/:partnerName", async (req, res) => {
  try {
    const partnerName = req.params.partnerName;
    const clients = await Client.find({ partnerName }).sort({
      createdAt: -1,
    });
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// Create a client for a partner
app.post("/api/clients/:partnerName", async (req, res) => {
  try {
    const partnerName = req.params.partnerName;

    const {
      startDate,
      client,
      spoc,
      location,
      roles,
      engagement,
      engagementOther,
      currentStatus,
      status,
      nextSteps,
      details,
      requirements,
    } = req.body;

    if (!client || !client.trim()) {
      return res.status(400).json({ error: "Client name is required" });
    }

    const newClient = await Client.create({
      partnerName,
      startDate,
      client: client.trim(),
      spoc,
      location,
      roles,
      engagement,
      engagementOther,
      currentStatus,
      status,
      nextSteps,
      details,
      requirements: requirements || [],
    });

    res.status(201).json(newClient);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// Update a client by id (used when editing, saving requirements etc.)
app.put("/api/clients/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const update = req.body;

    const updated = await Client.findByIdAndUpdate(clientId, update, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// Delete a client by id
app.delete("/api/clients/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const deleted = await Client.findByIdAndDelete(clientId);
    if (!deleted) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// -----------------------------------------------------
// Static HTML routes
// -----------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/partners.html", (req, res) => {
  res.sendFile(path.join(__dirname, "partners.html"));
});

app.get("/table.html", (req, res) => {
  res.sendFile(path.join(__dirname, "table.html"));
});

app.get("/details.html", (req, res) => {
  res.sendFile(path.join(__dirname, "details.html"));
});

app.get("/application.html", (req, res) => {
  res.sendFile(path.join(__dirname, "application.html"));
});

// Simple 404 for anything else
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// -----------------------------------------------------
// Start server
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
