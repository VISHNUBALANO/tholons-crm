// ===============================
// GLOBAL CONFIG
// ===============================
const API_BASE = window.location.origin + "/api";
// -------------------------------
// LOCAL STORAGE KEYS
// -------------------------------
const CURRENT_PARTNER_KEY = "crmCurrentPartner";
const CURRENT_CLIENT_INDEX_KEY = "crmCurrentClientIndex";
const CURRENT_REQUIREMENT_INDEX_KEY = "crmCurrentRequirementIndex";

// -------------------------------
// LOCAL STORAGE HELPERS
// -------------------------------
function setCurrentPartner(name) {
  localStorage.setItem(CURRENT_PARTNER_KEY, name);
}

function getCurrentPartner() {
  return localStorage.getItem(CURRENT_PARTNER_KEY);
}

function setCurrentClientIndex(index) {
  localStorage.setItem(CURRENT_CLIENT_INDEX_KEY, String(index));
}

function getCurrentClientIndex() {
  const val = localStorage.getItem(CURRENT_CLIENT_INDEX_KEY);
  if (val === null) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function setCurrentRequirementIndex(i) {
  localStorage.setItem(CURRENT_REQUIREMENT_INDEX_KEY, String(i));
}

function getCurrentRequirementIndex() {
  const val = localStorage.getItem(CURRENT_REQUIREMENT_INDEX_KEY);
  if (val === null) return null;
  return parseInt(val, 10);
}

// ===============================
// SIMPLE API HELPERS
// ===============================

// GET /api/partners  -> [ { _id, name } ]
async function apiGetPartners() {
  try {
    const res = await fetch(`${API_BASE}/partners`);
    if (!res.ok) throw new Error("Failed to load partners");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    alert("Could not load partners from server");
    return [];
  }
}

// POST /api/partners  body: { name }
async function apiAddPartner(name) {
  try {
    const res = await fetch(`${API_BASE}/partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error("Failed to create partner");
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Could not add partner on server");
    return null;
  }
}

// GET /api/clients/:partnerName  -> [ client docs ]
async function apiGetClientsForPartner(partnerName) {
  try {
    const encoded = encodeURIComponent(partnerName);
    const res = await fetch(`${API_BASE}/clients/${encoded}`);
    if (!res.ok) throw new Error("Failed to load clients");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    alert("Could not load clients from server");
    return [];
  }
}

// POST /api/clients/:partnerName  body: client fields
async function apiAddClient(partnerName, clientPayload) {
  try {
    const encoded = encodeURIComponent(partnerName);
    const res = await fetch(`${API_BASE}/clients/${encoded}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload)
    });
    if (!res.ok) throw new Error("Failed to save client");
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Could not save client to server");
    return null;
  }
}

// DELETE /api/clients/:id
async function apiDeleteClient(clientId) {
  try {
    const res = await fetch(`${API_BASE}/clients/${clientId}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete client");
    return true;
  } catch (err) {
    console.error(err);
    alert("Could not delete client on server");
    return false;
  }
}

// PUT /api/clients/:id  body: full client doc (used for requirements + candidates)
async function apiUpdateClient(clientId, clientDoc) {
  try {
    const res = await fetch(`${API_BASE}/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientDoc)
    });
    if (!res.ok) throw new Error("Failed to update client");
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Could not update client on server");
    return null;
  }
}

// ===============================
// PARTNERS PAGE
// ===============================
function initPartnersPage() {
  const partnersContainer = document.getElementById("partnersContainer");
  if (!partnersContainer) return; // not on this page

  const noPartnersMsg = document.getElementById("noPartnersMsg");
  const addPartnerBtn = document.getElementById("addPartnerBtn");

  async function renderPartners() {
    const partners = await apiGetPartners();
    partnersContainer.innerHTML = "";

    if (!partners.length) {
      noPartnersMsg.style.display = "block";
      return;
    }
    noPartnersMsg.style.display = "none";

    partners.forEach((p) => {
      // p is an object: { _id, name }
      const card = document.createElement("div");
      card.className = "partner-card";
      card.onclick = function () {
        setCurrentPartner(p.name);
        window.location.href = "table.html";
      };

      const title = document.createElement("div");
      title.className = "partner-name";
      title.textContent = p.name; // FIX: show name, not [object Object]

      const tag = document.createElement("div");
      tag.className = "partner-tag";
      tag.textContent = "Click to view client table";

      card.appendChild(title);
      card.appendChild(tag);
      partnersContainer.appendChild(card);
    });
  }

  renderPartners();

  addPartnerBtn.addEventListener("click", async function () {
    const name = prompt("Enter partner name:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const created = await apiAddPartner(trimmed);
    if (!created) return;
    await renderPartners();
  });
}

// ===============================
// TABLE PAGE (CLIENT LIST)
// ===============================
function initTablePage() {
  const clientsBody = document.getElementById("clientsBody");
  if (!clientsBody) return; // not on this page

  const partnerTitle = document.getElementById("partnerTitle");
  const addClientBtn = document.getElementById("addClientBtn");
  const saveBtn = document.getElementById("saveBtn");

  const startDateInput = document.getElementById("startDateInput");
  const clientInput = document.getElementById("clientInput");
  const spocInput = document.getElementById("spocInput");
  const locationInput = document.getElementById("locationInput");
  const rolesInput = document.getElementById("rolesInput");
  const engagementSelect = document.getElementById("engagementSelect");
  const engagementOtherWrapper = document.getElementById("engagementOtherWrapper");
  const engagementOtherInput = document.getElementById("engagementOtherInput");
  const currentStatusInput = document.getElementById("currentStatusInput");
  const statusInput = document.getElementById("statusInput");
  const nextStepsInput = document.getElementById("nextStepsInput");
  const detailsInput = document.getElementById("detailsInput");

  const currentPartner = getCurrentPartner();
  if (!currentPartner) {
    partnerTitle.textContent = "No partner selected. Go back and choose a partner.";
    return;
  }

  partnerTitle.textContent = "Partner: " + currentPartner;

  let clients = []; // holds array from server

  function renderTable() {
    clientsBody.innerHTML = "";

    if (!clients.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 12;
      td.className = "empty-text";
      td.textContent = "No clients yet. Add a client using the form above.";
      tr.appendChild(td);
      clientsBody.appendChild(tr);
      return;
    }

    clients.forEach((row, index) => {
      const tr = document.createElement("tr");

      function cell(text) {
        const td = document.createElement("td");
        td.textContent = text || "";
        return td;
      }

      tr.appendChild(cell(index + 1));               // Sl No
      tr.appendChild(cell(row.startDate));           // Start Date
      tr.appendChild(cell(row.client));              // Client
      tr.appendChild(cell(row.spoc));                // SPOC
      tr.appendChild(cell(row.location));            // Location
      tr.appendChild(cell(row.roles));               // Roles

      // Engagement (show "Others" actual text if needed)
      let engagementText = row.engagement || "";
      if (row.engagement === "Others" && row.engagementOther) {
        engagementText = row.engagementOther;
      }
      tr.appendChild(cell(engagementText));

      tr.appendChild(cell(row.currentStatus));       // Current Status
      tr.appendChild(cell(row.status));             // Status
      tr.appendChild(cell(row.nextSteps));          // Next Steps

      // Details / Edit
      const detailsTd = document.createElement("td");
      detailsTd.className = "actions-cell";

      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-secondary";
      viewBtn.textContent = "View";
      viewBtn.style.marginRight = "4px";
      viewBtn.onclick = function () {
        setCurrentClientIndex(index);
        window.location.href = "details.html";
      };

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-primary";
      editBtn.textContent = "Edit";
      editBtn.onclick = function () {
        // quick prompt-based editing (optional)
        const newStatus = prompt("Status", row.status || "");
        if (newStatus === null) return;
        row.status = newStatus;
        renderTable(); // local update only – full editing is handled in details page
      };

      detailsTd.appendChild(viewBtn);
      detailsTd.appendChild(editBtn);
      tr.appendChild(detailsTd);

      // Delete
      const delTd = document.createElement("td");
      delTd.className = "actions-cell";
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "Delete";
      delBtn.onclick = async function () {
        if (!confirm("Delete this client entry?")) return;
        if (!row._id) {
          alert("Cannot delete: client has no ID from server.");
          return;
        }
        const ok = await apiDeleteClient(row._id);
        if (!ok) return;
        clients.splice(index, 1);
        renderTable();
      };
      delTd.appendChild(delBtn);
      tr.appendChild(delTd);

      clientsBody.appendChild(tr);
    });
  }

  async function loadClients() {
    clients = await apiGetClientsForPartner(currentPartner);
    renderTable();
  }

  engagementSelect.addEventListener("change", function () {
    if (engagementSelect.value === "Others") {
      engagementOtherWrapper.style.display = "block";
    } else {
      engagementOtherWrapper.style.display = "none";
      engagementOtherInput.value = "";
    }
  });

  addClientBtn.addEventListener("click", async function () {
    const startDate = startDateInput.value;
    const client = clientInput.value.trim();
    const spoc = spocInput.value.trim();
    const location = locationInput.value.trim();
    const roles = rolesInput.value.trim();
    const engagement = engagementSelect.value;
    const engagementOther =
      engagement === "Others" ? engagementOtherInput.value.trim() : "";
    const currentStatus = currentStatusInput.value;
    const status = statusInput.value.trim();
    const nextSteps = nextStepsInput.value.trim();
    const details = detailsInput.value.trim();

    if (!client) {
      alert("Client name is required.");
      return;
    }
    if (engagement === "Others" && !engagementOther) {
      alert("Please specify engagement type for Others.");
      return;
    }

    const payload = {
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
      details
    };

    const saved = await apiAddClient(currentPartner, payload);
    if (!saved) return;

    // Ensure we always have an array for requirements
    if (!Array.isArray(saved.requirements)) {
      saved.requirements = [];
    }

    // Put newest on top
    clients.unshift(saved);
    renderTable();

    // clear form
    startDateInput.value = "";
    clientInput.value = "";
    spocInput.value = "";
    locationInput.value = "";
    rolesInput.value = "";
    engagementSelect.value = "Payroll";
    engagementOtherWrapper.style.display = "none";
    engagementOtherInput.value = "";
    currentStatusInput.value = "Active";
    statusInput.value = "";
    nextStepsInput.value = "";
    detailsInput.value = "";
  });

  // Save button is basically cosmetic now
  saveBtn.addEventListener("click", function () {
    alert("Data is already saved to MongoDB for this partner.");
  });

  loadClients();
}

// ===============================
// DETAILS PAGE (REQUIREMENTS + CANDIDATES)
// ===============================
function initDetailsPage() {
  const clientTitle = document.getElementById("clientTitle");
  if (!clientTitle) return; // not on this page

  const clientMeta = document.getElementById("clientMeta");
  const addRequirementBtn = document.getElementById("addRequirementBtn");
  const requirementForm = document.getElementById("requirementForm");
  const requirementFormTitle = document.getElementById("requirementFormTitle");
  const saveRequirementBtn = document.getElementById("saveRequirementBtn");
  const requirementsList = document.getElementById("requirementsList");

  const roleNameInput = document.getElementById("roleNameInput");
  const numReqInput = document.getElementById("numReqInput");
  const yearsExpReqInput = document.getElementById("yearsExpReqInput");
  const locationReqInput = document.getElementById("locationReqInput");
  const typePositionInput = document.getElementById("typePositionInput");
  const contractDurationInput = document.getElementById("contractDurationInput");
  const startDateReqInput = document.getElementById("startDateReqInput");
  const numSourcesInput = document.getElementById("numSourcesInput");
  const numShortlistedInput = document.getElementById("numShortlistedInput");
  const onedriveLinkInput = document.getElementById("onedriveLinkInput");
  const jobDescFileInput = document.getElementById("jobDescFileInput");
  const notesInput = document.getElementById("notesInput");

  const currentPartner = getCurrentPartner();
  const clientIndex = getCurrentClientIndex();

  if (!currentPartner || clientIndex === null) {
    clientTitle.textContent = "Client not found";
    clientMeta.textContent = "Go back to table and select a client.";
    return;
  }

  let clientDoc = null; // full document from server
  let editingRequirementIndex = null;

  async function loadClient() {
    const allClients = await apiGetClientsForPartner(currentPartner);
    if (!allClients[clientIndex]) {
      clientTitle.textContent = "Client not found";
      clientMeta.textContent = "Go back to table and select a client.";
      return;
    }
    clientDoc = allClients[clientIndex];
    if (!Array.isArray(clientDoc.requirements)) {
      clientDoc.requirements = [];
    }
    renderClientHeader();
    renderRequirements();
  }

  function renderClientHeader() {
    if (!clientDoc) return;
    clientTitle.textContent = clientDoc.client || "Client Details";
    const bits = [];
    bits.push("Partner: " + currentPartner);
    if (clientDoc.location) bits.push("Location: " + clientDoc.location);
    if (clientDoc.roles) bits.push("Role(s): " + clientDoc.roles);
    clientMeta.textContent = bits.join(" | ");
  }

  function clearRequirementForm() {
    roleNameInput.value = "";
    numReqInput.value = "";
    yearsExpReqInput.value = "";
    locationReqInput.value = "";
    typePositionInput.value = "";
    contractDurationInput.value = "";
    startDateReqInput.value = "";
    numSourcesInput.value = "";
    numShortlistedInput.value = "";
    onedriveLinkInput.value = "";
    notesInput.value = "";
    if (jobDescFileInput) jobDescFileInput.value = "";
  }

  function fillRequirementForm(req) {
    roleNameInput.value = req.roleName || "";
    numReqInput.value = req.numRequirements || "";
    yearsExpReqInput.value = req.yearsOfExp || "";
    locationReqInput.value = req.location || "";
    typePositionInput.value = req.typeOfPosition || "";
    contractDurationInput.value = req.contractDuration || "";
    startDateReqInput.value = req.startDate || "";
    numSourcesInput.value = req.numResumeSources || "";
    numShortlistedInput.value = req.numShortlistedResumes || "";
    onedriveLinkInput.value = req.onedriveLink || "";
    notesInput.value = req.notes || "";
    if (jobDescFileInput) jobDescFileInput.value = "";
  }

  async function persistClient() {
    if (!clientDoc || !clientDoc._id) {
      alert("Cannot save: client has no ID from server.");
      return;
    }
    const updated = await apiUpdateClient(clientDoc._id, clientDoc);
    if (updated) {
      clientDoc = updated;
      if (!Array.isArray(clientDoc.requirements)) {
        clientDoc.requirements = [];
      }
    }
  }

  function addCandidateForRequirement(rIndex) {
    const req = clientDoc.requirements[rIndex];
    if (!req) return;

    const candidateName = prompt("Candidate Name", "");
    if (candidateName === null || !candidateName.trim()) return;

    const position = prompt("Position", "") || "";
    const yearsOfExp = prompt("Years of Exp", "") || "";
    const currentSalary = prompt("Current Salary", "") || "";
    const expectedSalary = prompt("Expected Salary", "") || "";
    const marketSalary = prompt("Market Salary", "") || "";
    const clientSalary = prompt("Client Salary", "") || "";
    const hiringCostH2E = prompt("Hiring Cost (H2E)", "") || "";
    const costToClientC2C = prompt("Cost to client (C2C)", "") || "";
    const hourlyRate = prompt("Hourly Rate", "") || "";

    const cand = {
      candidateName,
      position,
      yearsOfExp,
      currentSalary,
      expectedSalary,
      marketSalary,
      clientSalary,
      hiringCostH2E,
      costToClientC2C,
      hourlyRate
    };

    req.candidates = req.candidates || [];
    req.candidates.push(cand);
    persistClient().then(renderRequirements);
  }

  function renderRequirements() {
    requirementsList.innerHTML = "";
    if (!clientDoc) return;

    const requirements = clientDoc.requirements || [];

    if (!requirements.length) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-text";
      emptyDiv.textContent = "No requirements yet. Click Add Requirement to create one.";
      requirementsList.appendChild(emptyDiv);
      return;
    }

    requirements.forEach((req, rIndex) => {
      const card = document.createElement("div");
      card.className = "requirement-card";

      const headerRow = document.createElement("div");
      headerRow.className = "requirement-header-row";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "requirement-title";
      title.textContent = req.roleName || "Requirement";

      const meta = document.createElement("div");
      meta.className = "requirement-meta";

      const metaParts = [];
      if (req.numRequirements) metaParts.push("Req: " + req.numRequirements);
      if (req.yearsOfExp) metaParts.push("Exp: " + req.yearsOfExp);
      if (req.location) metaParts.push("Location: " + req.location);
      if (req.typeOfPosition) metaParts.push("Type: " + req.typeOfPosition);
      if (req.contractDuration) metaParts.push("Duration: " + req.contractDuration);
      if (req.startDate) metaParts.push("Start: " + req.startDate);
      if (req.numResumeSources) metaParts.push("Sources: " + req.numResumeSources);
      if (req.numShortlistedResumes) metaParts.push("Shortlisted: " + req.numShortlistedResumes);
      meta.textContent = metaParts.join(" | ");

      left.appendChild(title);
      left.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "requirements-actions";

      const trackBtn = document.createElement("button");
      trackBtn.className = "btn btn-primary btn-small";
      trackBtn.textContent = "Track Application";
      trackBtn.onclick = function () {
        setCurrentRequirementIndex(rIndex);
        window.location.href = "application.html";
      };

      const addCandidateBtn = document.createElement("button");
      addCandidateBtn.className = "btn btn-secondary btn-small";
      addCandidateBtn.textContent = "Add Candidate";
      addCandidateBtn.onclick = function () {
        addCandidateForRequirement(rIndex);
      };

      const editReqBtn = document.createElement("button");
      editReqBtn.className = "btn btn-primary btn-small";
      editReqBtn.textContent = "Edit Requirement";
      editReqBtn.onclick = function () {
        editingRequirementIndex = rIndex;
        requirementFormTitle.textContent = "Edit Requirement";
        fillRequirementForm(req);
        requirementForm.style.display = "block";
      };

      const deleteReqBtn = document.createElement("button");
      deleteReqBtn.className = "btn btn-danger btn-small";
      deleteReqBtn.textContent = "Delete Requirement";
      deleteReqBtn.onclick = function () {
        if (!confirm("Delete this requirement and its candidates?")) return;
        clientDoc.requirements.splice(rIndex, 1);
        persistClient().then(renderRequirements);
      };

      actions.appendChild(trackBtn);
      actions.appendChild(addCandidateBtn);
      actions.appendChild(editReqBtn);
      actions.appendChild(deleteReqBtn);

      headerRow.appendChild(left);
      headerRow.appendChild(actions);
      card.appendChild(headerRow);

      // JD / Notes / OneDrive
      if (req.jobDescriptionFileName || req.notes || req.onedriveLink) {
        const infoDiv = document.createElement("div");
        infoDiv.className = "requirement-meta";
        infoDiv.style.marginTop = "4px";

        let first = true;

        if (req.jobDescriptionFileName) {
          const jdSpan = document.createElement("span");
          jdSpan.textContent = "JD: ";

          const dl = document.createElement("a");
          dl.textContent = "Download";
          dl.className = "requirement-link";
          if (req.jobDescriptionFileDataUrl) {
            dl.href = req.jobDescriptionFileDataUrl;
            dl.download = req.jobDescriptionFileName;
          } else {
            dl.href = "#";
            dl.onclick = function (e) {
              e.preventDefault();
              alert("File data not available.");
            };
          }

          infoDiv.appendChild(jdSpan);
          infoDiv.appendChild(dl);

          const delJdBtn = document.createElement("button");
          delJdBtn.textContent = "Delete JD";
          delJdBtn.className = "btn btn-danger btn-small";
          delJdBtn.style.marginLeft = "6px";
          delJdBtn.onclick = function () {
            if (!confirm("Delete JD file?")) return;
            clientDoc.requirements[rIndex].jobDescriptionFileName = "";
            clientDoc.requirements[rIndex].jobDescriptionFileDataUrl = "";
            persistClient().then(renderRequirements);
          };
          infoDiv.appendChild(delJdBtn);

          first = false;
        }

        if (req.notes) {
          if (!first) infoDiv.appendChild(document.createTextNode(" | "));
          infoDiv.appendChild(document.createTextNode("Notes: " + req.notes));
          first = false;
        }

        if (req.onedriveLink) {
          if (!first) infoDiv.appendChild(document.createTextNode(" | "));
          infoDiv.appendChild(document.createTextNode("OneDrive: "));
          const link = document.createElement("a");
          link.href = req.onedriveLink;
          link.target = "_blank";
          link.textContent = "Open link";
          link.className = "requirement-link";
          infoDiv.appendChild(link);
        }

        card.appendChild(infoDiv);
      }

      // Candidate table
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>Sl No</th>
          <th>Candidate Name</th>
          <th>Position</th>
          <th>Years of Exp</th>
          <th>Current Salary</th>
          <th>Expected Salary</th>
          <th>Market Salary</th>
          <th>Client Salary</th>
          <th>Hiring Cost (H2E)</th>
          <th>Cost to client (C2C)</th>
          <th>Hourly Rate</th>
          <th>Delete</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      const candidates = req.candidates || [];

      if (!candidates.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 12;
        td.className = "empty-text";
        td.textContent = "No candidates added yet.";
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        candidates.forEach((cand, cIndex) => {
          const tr = document.createElement("tr");

          function cell(text) {
            const td = document.createElement("td");
            td.textContent = text || "";
            return td;
          }

          tr.appendChild(cell(cIndex + 1));
          tr.appendChild(cell(cand.candidateName));
          tr.appendChild(cell(cand.position));
          tr.appendChild(cell(cand.yearsOfExp));
          tr.appendChild(cell(cand.currentSalary));
          tr.appendChild(cell(cand.expectedSalary));
          tr.appendChild(cell(cand.marketSalary));
          tr.appendChild(cell(cand.clientSalary));
          tr.appendChild(cell(cand.hiringCostH2E));
          tr.appendChild(cell(cand.costToClientC2C));
          tr.appendChild(cell(cand.hourlyRate));

          const delTd = document.createElement("td");
          const delBtn = document.createElement("button");
          delBtn.className = "btn btn-danger btn-small";
          delBtn.textContent = "Delete";
          delBtn.onclick = function () {
            if (!confirm("Delete this candidate?")) return;
            clientDoc.requirements[rIndex].candidates.splice(cIndex, 1);
            persistClient().then(renderRequirements);
          };
          delTd.appendChild(delBtn);
          tr.appendChild(delTd);

          tbody.appendChild(tr);
        });
      }

      table.appendChild(tbody);
      card.appendChild(table);
      requirementsList.appendChild(card);
    });
  }

  // Requirement form actions
  addRequirementBtn.addEventListener("click", function () {
    editingRequirementIndex = null;
    requirementFormTitle.textContent = "New Requirement";
    clearRequirementForm();
    requirementForm.style.display = "block";
  });

  saveRequirementBtn.addEventListener("click", function () {
    const roleName = roleNameInput.value.trim();
    const numRequirements = numReqInput.value.trim();
    const yearsOfExp = yearsExpReqInput.value.trim();
    const location = locationReqInput.value.trim();
    const typeOfPosition = typePositionInput.value.trim();
    const contractDuration = contractDurationInput.value.trim();
    const startDate = startDateReqInput.value;
    const numResumeSources = numSourcesInput.value.trim();
    const numShortlistedResumes = numShortlistedInput.value.trim();
    const onedriveLink = onedriveLinkInput.value.trim();
    const notes = notesInput.value.trim();
    const file = jobDescFileInput.files[0];

    if (!roleName) {
      alert("Role name is required.");
      return;
    }

    const baseReq = {
      roleName,
      numRequirements,
      yearsOfExp,
      location,
      typeOfPosition,
      contractDuration,
      startDate,
      numResumeSources,
      numShortlistedResumes,
      onedriveLink,
      notes
    };

    function finalizeRequirement(reqObj) {
      if (editingRequirementIndex === null) {
        clientDoc.requirements.push(reqObj);
      } else {
        // keep existing candidates
        const existing = clientDoc.requirements[editingRequirementIndex];
        reqObj.candidates = existing && existing.candidates ? existing.candidates : [];
        clientDoc.requirements[editingRequirementIndex] = reqObj;
        editingRequirementIndex = null;
      }

      persistClient().then(() => {
        clearRequirementForm();
        requirementForm.style.display = "none";
        renderRequirements();
      });
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const jobDescriptionFileDataUrl = e.target.result;
        const reqObj = {
          ...baseReq,
          jobDescriptionFileName: file.name,
          jobDescriptionFileDataUrl
        };
        finalizeRequirement(reqObj);
      };
      reader.readAsDataURL(file);
    } else {
      let prev = null;
      if (editingRequirementIndex !== null) {
        prev = clientDoc.requirements[editingRequirementIndex] || null;
      }
      const reqObj = {
        ...baseReq,
        jobDescriptionFileName: prev ? prev.jobDescriptionFileName : "",
        jobDescriptionFileDataUrl: prev ? prev.jobDescriptionFileDataUrl : "",
        candidates: prev && prev.candidates ? prev.candidates : []
      };
      finalizeRequirement(reqObj);
    }
  });

  loadClient();
}

function openApplicationPage(reqIndex) {
  setCurrentRequirementIndex(reqIndex);
  window.location.href = "application.html";
}
document.addEventListener("DOMContentLoaded", function () {
  initPartnersPage();
  initTablePage();
  initDetailsPage();
});
