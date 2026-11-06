/* ============================================================
   CLH AppHub — Application Portfolio (front-end demo)
   Data is persisted in localStorage so the page can be used
   without a backend.
   ============================================================ */

const STORAGE_APPS = "clh_apps";
const STORAGE_ACTIVITY = "clh_activity";
const CURRENT_USER = "A. Administrator";

const STATUS = {
  ACTIVE: "Active",
  MAINTENANCE: "Under Maintenance",
  DEPRECATED: "Deprecated"
};

/* Semantic versions such as 1.4.2, 2.0.0-rc1 */
const VERSION_PATTERN = /^\d+\.\d+\.\d+([.-][0-9A-Za-z-]+)?$/;

let selectedAppId = null;
let deleteAppId = null;
let toastTimer = null;

/* ---------- Demo data (used on first load) ---------- */

function seedApps() {
  return [
    {
      id: 1,
      name: "Customer Portal",
      owner: "Digital Experience Team",
      version: "2.4.1",
      status: STATUS.ACTIVE,
      description: "Self-service portal for customer accounts and billing.",
      updated: "2026-10-30 11:20",
      updatedTs: new Date("2026-10-30T11:20:00").getTime(),
      history: [
        { version: "2.4.1", notes: "Performance improvements and bug fixes.", date: "2026-10-30 11:20", author: "A. Administrator" },
        { version: "2.4.0", notes: "Added two-factor authentication.", date: "2026-08-14 09:05", author: "J. Sharma" },
        { version: "2.3.0", notes: "Initial public release of the portal.", date: "2026-05-02 16:40", author: "J. Sharma" }
      ]
    },
    {
      id: 2,
      name: "HR Service Desk",
      owner: "IT Operations",
      version: "1.8.0",
      status: STATUS.ACTIVE,
      description: "Internal ticketing for HR and IT support requests.",
      updated: "2026-09-18 15:47",
      updatedTs: new Date("2026-09-18T15:47:00").getTime(),
      history: [
        { version: "1.8.0", notes: "SLA reporting dashboard.", date: "2026-09-18 15:47", author: "A. Administrator" },
        { version: "1.7.2", notes: "Fixed email notification delays.", date: "2026-07-01 10:12", author: "M. Chen" }
      ]
    },
    {
      id: 3,
      name: "Legacy Claims Processor",
      owner: "Claims Department",
      version: "4.2.0",
      status: STATUS.MAINTENANCE,
      description: "Batch claims processing engine being phased out.",
      updated: "2026-06-11 08:30",
      updatedTs: new Date("2026-06-11T08:30:00").getTime(),
      history: [
        { version: "4.2.0", notes: "Stability patches only — migration in progress.", date: "2026-06-11 08:30", author: "A. Administrator" }
      ]
    },
    {
      id: 4,
      name: "Vendor Invoice Tracker",
      owner: "Finance Systems",
      version: "3.0.1",
      status: STATUS.DEPRECATED,
      description: "Replaced by the ERP invoicing module.",
      updated: "2025-12-19 17:02",
      updatedTs: new Date("2025-12-19T17:02:00").getTime(),
      history: [
        { version: "3.0.1", notes: "Final maintenance release before decommission.", date: "2025-12-19 17:02", author: "A. Administrator" }
      ]
    }
  ];
}

function seedActivity() {
  return [
    { id: 104, appId: 4, appName: "Vendor Invoice Tracker", action: "Status changed", detail: "Status set to Deprecated.", date: "2025-12-19 17:02", ts: new Date("2025-12-19T17:02:00").getTime() },
    { id: 103, appId: 3, appName: "Legacy Claims Processor", action: "Status changed", detail: "Status set to Under Maintenance.", date: "2026-06-11 08:30", ts: new Date("2026-06-11T08:30:00").getTime() },
    { id: 102, appId: 2, appName: "HR Service Desk", action: "Version published", detail: "v1.8.0 — SLA reporting dashboard.", date: "2026-09-18 15:47", ts: new Date("2026-09-18T15:47:00").getTime() },
    { id: 101, appId: 1, appName: "Customer Portal", action: "Version published", detail: "v2.4.1 — Performance improvements and bug fixes.", date: "2026-10-30 11:20", ts: new Date("2026-10-30T11:20:00").getTime() }
  ];
}

/* ---------- State ---------- */

function loadApps() {
  const stored = localStorage.getItem(STORAGE_APPS);
  if (stored) return JSON.parse(stored);

  // One-time migration from the previous version of this page.
  const legacy = localStorage.getItem("apps");
  if (legacy) {
    return JSON.parse(legacy).map(app => ({
      ...app,
      description: app.description || "",
      updatedTs: app.updatedTs || Date.now(),
      history: (app.history || []).map(h => ({
        ...h,
        author: h.author || "Unknown"
      }))
    }));
  }
  return seedApps();
}

function loadActivity() {
  const stored = localStorage.getItem(STORAGE_ACTIVITY);
  const list = stored ? JSON.parse(stored) : seedActivity();

  // Versions before the permanent-delete change recorded an
  // "Application deleted" event. Those applications no longer exist, so
  // their records are dropped to leave no trace of them.
  const cleaned = list.filter(item => item.action !== "Application deleted");
  if (stored && cleaned.length !== list.length) {
    localStorage.setItem(STORAGE_ACTIVITY, JSON.stringify(cleaned));
  }
  return cleaned;
}

let apps = loadApps();
let activity = loadActivity();

function saveApps() {
  localStorage.setItem(STORAGE_APPS, JSON.stringify(apps));
}

function saveActivity() {
  localStorage.setItem(STORAGE_ACTIVITY, JSON.stringify(activity));
}

function saveAll() {
  saveApps();
  saveActivity();
}

/* ---------- Helpers ---------- */

function esc(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function nowStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadgeClass(status) {
  switch (status) {
    case STATUS.ACTIVE: return "badge-success";
    case STATUS.MAINTENANCE: return "badge-warning";
    default: return "badge-neutral";
  }
}

function logActivity(appId, appName, action, detail) {
  activity.unshift({
    id: Date.now(),
    appId,
    appName,
    action,
    detail,
    date: nowStamp(),
    ts: Date.now()
  });
}

function toast(message, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (message) {
    input.classList.add("invalid");
    error.textContent = message;
    return false;
  }
  input.classList.remove("invalid");
  error.textContent = "";
  return true;
}

function validateVersion(inputId, errorId, currentVersion) {
  const value = document.getElementById(inputId).value.trim();
  let message = "";
  if (!value) {
    message = "Version is required.";
  } else if (!VERSION_PATTERN.test(value)) {
    message = "Use semantic format, e.g. 1.4.2 or 2.0.0-rc1.";
  } else if (currentVersion !== undefined && value === currentVersion) {
    message = "New version must differ from the current version.";
  }
  return setFieldError(inputId, errorId, message);
}

/* ---------- Modal plumbing ---------- */

function openModal(id, focusId) {
  document.getElementById(id).classList.add("show");
  document.body.classList.add("modal-open");
  if (focusId) {
    const focusTarget = document.getElementById(focusId);
    setTimeout(() => focusTarget.focus(), 0);
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
  if (!document.querySelector(".modal-overlay.show")) {
    document.body.classList.remove("modal-open");
  }
}

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-overlay.show")
      .forEach(modal => closeModal(modal.id));
  }
});

/* ---------- View switching ---------- */

function switchView(view) {
  document.getElementById("applicationsView").hidden = view !== "applications";
  document.getElementById("activityView").hidden = view !== "activity";

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  if (view === "activity") renderActivity();
}

/* ---------- Rendering ---------- */

function renderApps() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const filtered = apps.filter(app =>
    app.name.toLowerCase().includes(query) ||
    app.owner.toLowerCase().includes(query)
  );

  const tbody = document.getElementById("appTable");
  tbody.innerHTML = filtered.map(app => `
    <tr>
      <td>
        <strong>${esc(app.name)}</strong>
        ${app.description ? `<div class="cell-sub">${esc(app.description)}</div>` : ""}
      </td>
      <td>${esc(app.owner)}</td>
      <td><span class="badge badge-version">v${esc(app.version)}</span></td>
      <td><span class="badge ${statusBadgeClass(app.status)}">${esc(app.status)}</span></td>
      <td class="nowrap">${esc(app.updated)}</td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditModal(${app.id})"
          aria-label="Edit details of ${esc(app.name)}">Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="openVersionModal(${app.id})">New version</button>
        <button class="btn btn-ghost btn-sm" onclick="showHistory(${app.id})">History</button>
        <button class="btn btn-ghost btn-sm danger-text" onclick="openDeleteModal(${app.id})"
          aria-label="Delete ${esc(app.name)}">Delete</button>
      </td>
    </tr>
  `).join("");

  const count = document.getElementById("appCount");
  count.textContent = query
    ? `Showing ${filtered.length} of ${apps.length} applications`
    : `${apps.length} application${apps.length === 1 ? "" : "s"}`;

  const empty = document.getElementById("emptyState");
  empty.hidden = filtered.length > 0;
  document.getElementById("emptyText").textContent = query
    ? `No applications match "${query}". Try a different search term.`
    : "Get started by creating your first application.";
}

function renderStats() {
  const now = new Date();
  document.getElementById("statTotal").textContent = apps.length;
  document.getElementById("statActive").textContent =
    apps.filter(a => a.status === STATUS.ACTIVE).length;

  const updatedThisMonth = apps.filter(a => {
    const d = new Date(a.updatedTs);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  document.getElementById("statUpdated").textContent = updatedThisMonth;
}

function renderActivity() {
  const list = document.getElementById("activityList");
  list.innerHTML = activity.map(item => `
    <div class="activity-item">
      <span class="activity-dot" aria-hidden="true"></span>
      <div class="activity-body">
        <div class="activity-action">${esc(item.action)}</div>
        <div class="activity-detail">
          <strong>${esc(item.appName)}</strong> — ${esc(item.detail)}
        </div>
      </div>
      <div class="activity-meta">${esc(item.date)}<br>by ${esc(CURRENT_USER)}</div>
    </div>
  `).join("");

  document.getElementById("activityEmpty").hidden = activity.length > 0;
}

/* ---------- Create application ---------- */

function openCreateModal() {
  ["cName", "cOwner", "cVersion"].forEach(id =>
    document.getElementById(id).classList.remove("invalid"));
  ["cNameError", "cOwnerError", "cVersionError"].forEach(id =>
    document.getElementById(id).textContent = "");
  openModal("createModal", "cName");
}

function createApp() {
  const name = document.getElementById("cName").value.trim();
  const owner = document.getElementById("cOwner").value.trim();
  const status = document.getElementById("cStatus").value;
  const description = document.getElementById("cDesc").value.trim();

  let valid = true;
  valid = setFieldError("cName", "cNameError",
    name ? "" : "Application name is required.") && valid;
  valid = setFieldError("cOwner", "cOwnerError",
    owner ? "" : "Owner team is required.") && valid;
  valid = validateVersion("cVersion", "cVersionError") && valid;
  if (!valid) return;

  const version = document.getElementById("cVersion").value.trim();
  const stamp = nowStamp();

  const app = {
    id: Date.now(),
    name,
    owner,
    version,
    status,
    description,
    updated: stamp,
    updatedTs: Date.now(),
    history: [{
      version,
      notes: "Application registered.",
      date: stamp,
      author: CURRENT_USER
    }]
  };

  apps.unshift(app);
  logActivity(app.id, name, "Application created", `Registered at v${version}.`);
  saveAll();
  renderApps();
  renderStats();
  closeModal("createModal");

  document.getElementById("cName").value = "";
  document.getElementById("cOwner").value = "";
  document.getElementById("cVersion").value = "";
  document.getElementById("cDesc").value = "";

  toast(`Application "${name}" created.`);
}

/* ---------- Edit application details ---------- */

function openEditModal(id) {
  const app = apps.find(a => a.id === id);
  selectedAppId = id;

  document.getElementById("editAppInfo").textContent =
    `${app.name} — current version v${app.version}`;
  document.getElementById("eName").value = app.name;
  document.getElementById("eOwner").value = app.owner;
  document.getElementById("eStatus").value = app.status;
  document.getElementById("eDesc").value = app.description || "";

  ["eName", "eOwner"].forEach(fieldId =>
    document.getElementById(fieldId).classList.remove("invalid"));
  ["eNameError", "eOwnerError"].forEach(errorId =>
    document.getElementById(errorId).textContent = "");

  openModal("editModal", "eName");
}

function saveEdit() {
  const app = apps.find(a => a.id === selectedAppId);
  const name = document.getElementById("eName").value.trim();
  const owner = document.getElementById("eOwner").value.trim();
  const status = document.getElementById("eStatus").value;
  const description = document.getElementById("eDesc").value.trim();

  let valid = true;
  valid = setFieldError("eName", "eNameError",
    name ? "" : "Application name is required.") && valid;
  valid = setFieldError("eOwner", "eOwnerError",
    owner ? "" : "Owner team is required.") && valid;
  if (!valid) return;

  const changes = [];
  if (name !== app.name) changes.push("name");
  if (owner !== app.owner) changes.push("owner");
  if (status !== app.status) changes.push("status");
  if (description !== (app.description || "")) changes.push("description");

  app.name = name;
  app.owner = owner;
  app.status = status;
  app.description = description;
  app.updated = nowStamp();
  app.updatedTs = Date.now();

  logActivity(
    app.id,
    name,
    "Details updated",
    changes.length
      ? `Updated: ${changes.join(", ")}.`
      : "Saved with no changes."
  );

  saveAll();
  renderApps();
  renderStats();
  closeModal("editModal");
  toast(`Details for "${name}" saved.`);
}

/* ---------- Publish new version ---------- */

function openVersionModal(id) {
  const app = apps.find(a => a.id === id);
  selectedAppId = id;

  document.getElementById("selectedAppInfo").textContent =
    `${app.name} — current version v${app.version}`;

  document.getElementById("vNew").value = "";
  document.getElementById("vNotes").value = "";
  document.getElementById("vNew").classList.remove("invalid");
  document.getElementById("vNotes").classList.remove("invalid");
  document.getElementById("vNewError").textContent = "";
  document.getElementById("vNotesError").textContent = "";

  openModal("versionModal", "vNew");
}

function updateVersion() {
  const app = apps.find(a => a.id === selectedAppId);
  const notes = document.getElementById("vNotes").value.trim();

  let valid = true;
  valid = validateVersion("vNew", "vNewError", app.version) && valid;
  valid = setFieldError("vNotes", "vNotesError",
    notes ? "" : "Release notes are required.") && valid;
  if (!valid) return;

  const version = document.getElementById("vNew").value.trim();
  const stamp = nowStamp();

  app.version = version;
  app.updated = stamp;
  app.updatedTs = Date.now();
  app.history.unshift({
    version,
    notes,
    date: stamp,
    author: CURRENT_USER
  });

  logActivity(app.id, app.name, "Version published", `v${version} — ${notes}`);
  saveAll();
  renderApps();
  renderStats();
  closeModal("versionModal");
  toast(`Version ${version} published for "${app.name}".`);
}

/* ---------- Version history ---------- */

function showHistory(id) {
  const app = apps.find(a => a.id === id);

  document.getElementById("historyTitle").textContent =
    `${app.name} — Version History`;

  document.getElementById("historyContent").innerHTML = app.history.map(entry => `
    <div class="timeline-item">
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-body">
        <div class="timeline-head">
          <span class="badge badge-version">v${esc(entry.version)}</span>
          <time>${esc(entry.date)}</time>
        </div>
        <p>${esc(entry.notes)}</p>
        <small>Published by ${esc(entry.author)}</small>
      </div>
    </div>
  `).join("");

  openModal("historyModal");
}

/* ---------- Delete application ---------- */

function openDeleteModal(id) {
  deleteAppId = id;
  const app = apps.find(a => a.id === id);
  document.getElementById("deleteAppName").textContent = app.name;
  openModal("deleteModal");
}

function deleteApp() {
  const index = apps.findIndex(a => a.id === deleteAppId);
  if (index === -1) return;

  const [removed] = apps.splice(index, 1);

  // Remove every trace of the application: its version history is
  // deleted together with the app record, and all of its entries are
  // purged from the activity log. The deletion itself is intentionally
  // not logged, so nothing about the app is retained anywhere.
  activity = activity.filter(item =>
    item.appId !== removed.id && item.appName !== removed.name
  );

  saveAll();
  renderApps();
  renderStats();
  closeModal("deleteModal");
  toast(`Application "${removed.name}" deleted permanently.`, "danger");
}

/* ---------- Search ---------- */

document.getElementById("searchInput").addEventListener("input", renderApps);

/* ---------- Start ---------- */

renderApps();
renderStats();
renderActivity();
