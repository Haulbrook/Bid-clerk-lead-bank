import { useState, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbwLCL9-jaFkNLKy21ZegJEHHGmgoR8oj_EGA46Ahrv1r653I9Cg5AUrr24Cg5ILOpdvZg/exec";

const STATUSES = ["New", "Claimed", "Contacted", "Quoted", "Won", "Lost", "Passed"];
const COUNTIES = ["All", "Hall", "Barrow", "Forsyth", "Gwinnett", "Jackson", "Dawson", "Lumpkin", "Other"];
const SALESMAN_COLORS = { "Unassigned": "#64748b", "Trey": "#2563eb", "Salesman 2": "#059669", "Salesman 3": "#d97706", "Salesman 4": "#dc2626", "Salesman 5": "#7c3aed", "Salesman 6": "#0891b2" };
const SALESMEN = Object.keys(SALESMAN_COLORS);
const STATUS_COLORS = {
  "New": { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" }, "Claimed": { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  "Contacted": { bg: "#e0e7ff", text: "#3730a3", dot: "#6366f1" }, "Quoted": { bg: "#fce7f3", text: "#9d174d", dot: "#ec4899" },
  "Won": { bg: "#d1fae5", text: "#065f46", dot: "#10b981" }, "Lost": { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  "Passed": { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
};
const NAV_ITEMS = [
  { id: "matching", label: "Matching Bids", icon: "\u{1F3AF}", description: "Landscape-relevant opportunities" },
  { id: "all-bids", label: "All Bids", icon: "\u{1F4CB}", description: "Everything scraped" },
  { id: "ldp", label: "LDP Leads", icon: "\u{1F3D8}\uFE0F", description: "Subdivision permits" },
  { id: "rezoning", label: "Rezoning", icon: "\u{1F5FA}\uFE0F", description: "Rezoning activity" },
  { id: "manual", label: "Manual Leads", icon: "\u270F\uFE0F", description: "Manually added" },
];

const MOCK_LEADS = [
  { id: "BID-001", type: "Gov Bid", title: "Cherokee Bluffs Park Rubber Mulch Playground Surfacing", source: "Hall County", county: "Hall", closes: "2026-03-15", matchedKeywords: "mulch", url: "https://www.hallcounty.org/bids/001", status: "New", assignee: "Unassigned", notes: "", dateFound: "2026-02-11", isMatch: "YES" },
  { id: "BID-002", type: "Gov Bid", title: "Irrigation System Upgrade - Civic Center", source: "City of Gainesville", county: "Hall", closes: "2026-03-20", matchedKeywords: "irrigation", url: "", status: "Claimed", assignee: "Trey", notes: "Reviewed specs", dateFound: "2026-02-09", isMatch: "YES" },
  { id: "BID-003", type: "Gov Bid", title: "RFB2026 - 04 Ford Super Duty F600 with Dump Body", source: "Barrow County", county: "Barrow", closes: "2026-04-01", matchedKeywords: "", url: "", status: "New", assignee: "Unassigned", notes: "", dateFound: "2026-02-11", isMatch: "" },
  { id: "BID-004", type: "Gov Bid", title: "Retaining Wall Construction - Hwy 53", source: "Dawson County", county: "Dawson", closes: "2026-04-01", matchedKeywords: "retaining, wall", url: "", status: "Contacted", assignee: "Salesman 2", notes: "Called PM", dateFound: "2026-02-08", isMatch: "YES" },
  { id: "SUB-001", type: "Subdivision", title: "Sterling on the Lake Phase 4 - 85 Lots LDP", source: "Hall County Accela", county: "Hall", closes: "", matchedKeywords: "subdivision, LDP", url: "", status: "New", assignee: "Unassigned", notes: "", dateFound: "2026-02-11", isMatch: "YES" },
  { id: "REZ-001", type: "Rezoning", title: "Rezoning R-1 to PRD - Thompson Bridge Rd 42 Acres", source: "Hall County Planning", county: "Hall", closes: "", matchedKeywords: "rezoning", url: "", status: "New", assignee: "Unassigned", notes: "", dateFound: "2026-02-10", isMatch: "YES" },
  { id: "MAN-001", type: "Manual", title: "HOA Maintenance Contract - River Club", source: "Manual Entry", county: "Hall", closes: "2026-04-15", matchedKeywords: "", url: "", status: "Contacted", assignee: "Trey", notes: "Associa PM contact", dateFound: "2026-02-06", isMatch: "" },
];

function daysUntil(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); }
function formatDate(d) { if (!d) return "\u2014"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function filterByPage(leads, id) {
  switch (id) {
    case "matching": return leads.filter(l => l.isMatch === "YES");
    case "all-bids": return leads.filter(l => l.type === "Gov Bid");
    case "ldp": return leads.filter(l => l.type === "Subdivision");
    case "rezoning": return leads.filter(l => l.type === "Rezoning");
    case "manual": return leads.filter(l => l.type === "Manual");
    default: return leads;
  }
}

function StatCard({ label, value, color, icon }) {
  return (<div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", flex: "1 1 140px", minWidth: 140 }}>
    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>{icon} {label}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
  </div>);
}
function FilterPill({ label, active, onClick }) {
  return (<button onClick={onClick} style={{ padding: "6px 16px", borderRadius: 20, border: active ? "1.5px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)", color: active ? "#93c5fd" : "#94a3b8", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{label}</button>);
}
function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["New"];
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 12, background: c.bg, color: c.text, fontSize: 11, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{status}</span>);
}
function AssigneeBadge({ name }) {
  const color = SALESMAN_COLORS[name] || "#64748b";
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color, fontWeight: name === "Unassigned" ? 400 : 600 }}><span style={{ width: 22, height: 22, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{name === "Unassigned" ? "?" : name.charAt(0)}</span>{name}</span>);
}

function LeadRow({ lead, onOpen }) {
  const days = daysUntil(lead.closes);
  const urgent = days !== null && days >= 0 && days <= 7;
  const expired = days !== null && days < 0;
  return (
    <tr onClick={() => onOpen(lead)} style={{ cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <td style={{ padding: "12px 14px", fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{lead.id}</td>
      <td style={{ padding: "12px 8px" }}><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: lead.type === "Gov Bid" ? "#60a5fa" : lead.type === "Subdivision" ? "#34d399" : lead.type === "Rezoning" ? "#fbbf24" : "#a78bfa" }}>{lead.type}</span></td>
      <td style={{ padding: "12px 8px" }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "#e2e8f0", lineHeight: 1.3, maxWidth: 340 }}>{lead.title}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{lead.source}</div>
      </td>
      <td style={{ padding: "12px 8px", fontSize: 12, color: "#94a3b8" }}>{lead.county}</td>
      <td style={{ padding: "12px 8px" }}>
        {lead.closes ? (<span style={{ fontSize: 12, fontWeight: 500, color: expired ? "#64748b" : urgent ? "#ef4444" : "#e2e8f0", textDecoration: expired ? "line-through" : "none" }}>{formatDate(lead.closes)}{urgent && !expired && <span style={{ marginLeft: 4, fontSize: 10 }}>{"\u{1F525}"}</span>}</span>) : <span style={{ color: "#475569", fontSize: 12 }}>{"\u2014"}</span>}
      </td>
      <td style={{ padding: "12px 8px" }}><StatusBadge status={lead.status} /></td>
      <td style={{ padding: "12px 8px" }}><AssigneeBadge name={lead.assignee} /></td>
    </tr>
  );
}

function LeadDetailModal({ lead, onClose, onSave }) {
  const [status, setStatus] = useState(lead.status);
  const [assignee, setAssignee] = useState(lead.assignee);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { const h = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const handleSave = async () => { setSaving(true); await onSave({ ...lead, status, assignee, notes }); setSaving(false); onClose(); };
  const days = daysUntil(lead.closes);
  const ss = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer" };
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: lead.type === "Gov Bid" ? "#60a5fa" : lead.type === "Subdivision" ? "#34d399" : lead.type === "Rezoning" ? "#fbbf24" : "#a78bfa" }}>{lead.type} {"\u2022"} {lead.id}</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "8px 0 4px", lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>{lead.title}</h2>
              <div style={{ fontSize: 13, color: "#64748b" }}>{lead.source} {"\u2014"} {lead.county} County</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
          </div>
        </div>
        <div style={{ padding: "16px 28px", display: "flex", gap: 24, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {lead.closes && <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Closes</div><div style={{ fontSize: 14, fontWeight: 600, color: days !== null && days >= 0 && days <= 7 ? "#ef4444" : "#e2e8f0" }}>{formatDate(lead.closes)}{days !== null && days >= 0 && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}> ({days}d)</span>}</div></div>}
          <div><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Found</div><div style={{ fontSize: 14, color: "#e2e8f0" }}>{formatDate(lead.dateFound)}</div></div>
          {lead.matchedKeywords && <div style={{ flex: "1 1 100%" }}><div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Matched Keywords</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{lead.matchedKeywords.split(",").map((kw, i) => <span key={i} style={{ padding: "2px 8px", borderRadius: 8, background: "rgba(59,130,246,0.1)", color: "#93c5fd", fontSize: 11, fontWeight: 500 }}>{kw.trim()}</span>)}</div></div>}
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Status</label><select value={status} onChange={e => setStatus(e.target.value)} style={ss}>{STATUSES.map(s => <option key={s} value={s} style={{ background: "#1e293b" }}>{s}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Assigned To</label><select value={assignee} onChange={e => setAssignee(e.target.value)} style={ss}>{SALESMEN.map(s => <option key={s} value={s} style={{ background: "#1e293b" }}>{s}</option>)}</select></div>
          </div>
          <div><label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add notes..." style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} /></div>
          {lead.url && <a href={lead.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#60a5fa", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>{"\u2197"} View Original Posting</a>}
        </div>
        <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, background: "#2563eb", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function AddLeadModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ type: "Manual", title: "", source: "Manual Entry", county: "Hall", closes: "", matchedKeywords: "", url: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async () => { if (!form.title.trim()) return; setSaving(true); await onAdd({ ...form, id: "MAN-" + Date.now().toString(36).toUpperCase(), status: "New", assignee: "Unassigned", dateFound: new Date().toISOString().split("T")[0], isMatch: "" }); setSaving(false); onClose(); };
  const fs = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
  const ls = { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Add Lead Manually</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={ls}>Lead Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. HOA Maintenance - River Club" style={fs} /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><label style={ls}>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...fs, cursor: "pointer" }}>{["Gov Bid", "Subdivision", "Rezoning", "Manual"].map(t => <option key={t} value={t} style={{ background: "#1e293b" }}>{t}</option>)}</select></div>
            <div style={{ flex: 1 }}><label style={ls}>County</label><select value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} style={{ ...fs, cursor: "pointer" }}>{COUNTIES.filter(c => c !== "All").map(c => <option key={c} value={c} style={{ background: "#1e293b" }}>{c}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><label style={ls}>Source</label><input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Where from?" style={fs} /></div>
            <div style={{ flex: 1 }}><label style={ls}>Closes</label><input type="date" value={form.closes} onChange={e => setForm({ ...form, closes: e.target.value })} style={fs} /></div>
          </div>
          <div><label style={ls}>URL (optional)</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." style={fs} /></div>
          <div><label style={ls}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any context..." style={{ ...fs, resize: "vertical" }} /></div>
        </div>
        <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.title.trim()} style={{ padding: "10px 24px", borderRadius: 10, background: "#2563eb", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? "Adding..." : "Add Lead"}</button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ activePage, onPageChange, leads, collapsed, onToggle }) {
  const getCounts = (pageId) => filterByPage(leads, pageId).length;
  return (
    <aside style={{ width: collapsed ? 60 : 240, minHeight: "100vh", background: "rgba(2,6,23,0.95)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", transition: "width 0.2s ease", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}>
      <div style={{ padding: collapsed ? "20px 12px" : "20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg, #16a34a, #15803d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u{1F33F}"}</div>
        {!collapsed && <div><div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.2 }}>Deep Roots</div><div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.04em" }}>Lead Bank</div></div>}
      </div>
      <nav style={{ padding: "12px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          const count = getCounts(item.id);
          return (
            <button key={item.id} onClick={() => onPageChange(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: active ? "rgba(59,130,246,0.12)" : "transparent", transition: "all 0.12s ease", width: "100%", textAlign: "left" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#93c5fd" : "#cbd5e1", fontFamily: "'DM Sans', sans-serif" }}>{item.label}</div></div><span style={{ fontSize: 11, fontWeight: 600, color: active ? "#93c5fd" : "#64748b", background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 8, minWidth: 24, textAlign: "center" }}>{count}</span></>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onToggle} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.03)", cursor: "pointer", color: "#64748b", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>{collapsed ? "\u2192" : "\u2190 Collapse"}</button>
      </div>
    </aside>
  );
}

export default function LeadBankDashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePage, setActivePage] = useState("matching");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [countyFilter, setCountyFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(API_URL + "?action=getLeads");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLeads(data.leads && data.leads.length > 0 ? data.leads : MOCK_LEADS);
      setLastRefresh(new Date());
    } catch (err) { setError(err.message); setLeads(MOCK_LEADS); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSaveLead = async (updatedLead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    try { await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "updateLead", lead: updatedLead }) }); } catch (err) { console.error("Save failed:", err); }
  };
  const handleAddLead = async (newLead) => {
    setLeads(prev => [newLead, ...prev]);
    try { await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "addLead", lead: newLead }) }); } catch (err) { console.error("Add failed:", err); }
  };

  const pageLeads = filterByPage(leads, activePage);
  const filtered = pageLeads.filter(l => {
    if (statusFilter !== "All" && l.status !== statusFilter) return false;
    if (countyFilter !== "All" && l.county !== countyFilter) return false;
    if (assigneeFilter !== "All" && l.assignee !== assigneeFilter) return false;
    if (search) { const q = search.toLowerCase(); return (l.title + l.source + l.notes + l.matchedKeywords + l.id).toLowerCase().includes(q); }
    return true;
  });
  const totalNew = pageLeads.filter(l => l.status === "New").length;
  const totalActive = pageLeads.filter(l => ["Claimed", "Contacted", "Quoted"].includes(l.status)).length;
  const totalWon = pageLeads.filter(l => l.status === "Won").length;
  const urgentCount = pageLeads.filter(l => { const d = daysUntil(l.closes); return d !== null && d >= 0 && d <= 7 && !["Won", "Lost", "Passed"].includes(l.status); }).length;
  const currentNav = NAV_ITEMS.find(n => n.id === activePage);
  const sidebarWidth = sidebarCollapsed ? 60 : 240;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg, #020617 0%, #0f172a 40%, #020617 100%)", color: "#e2e8f0", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020617; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::selection { background: rgba(59,130,246,0.3); }
        option { background: #1e293b; color: #e2e8f0; }
      `}</style>

      <Sidebar activePage={activePage} onPageChange={(id) => { setActivePage(id); setStatusFilter("All"); setCountyFilter("All"); setAssigneeFilter("All"); setSearch(""); }} leads={leads} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div style={{ marginLeft: sidebarWidth, transition: "margin-left 0.2s ease" }}>
        <header style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8 }}><span>{currentNav.icon}</span> {currentNav.label}</h1>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{currentNav.description} {"\u2022"} {pageLeads.length} leads {"\u2022"} Last refreshed {lastRefresh ? lastRefresh.toLocaleTimeString() : "\u2014"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchLeads} style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{"\u21BB"} Refresh</button>
            <button onClick={() => setShowAddModal(true)} style={{ padding: "9px 18px", borderRadius: 10, background: "#16a34a", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Add Lead</button>
          </div>
        </header>

        <main style={{ padding: "24px 32px", maxWidth: 1400 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
            <StatCard label="New Leads" value={totalNew} color="#3b82f6" icon={"\u{1F4E5}"} />
            <StatCard label="Active Pipeline" value={totalActive} color="#f59e0b" icon={"\u{1F504}"} />
            <StatCard label="Won" value={totalWon} color="#10b981" icon={"\u2705"} />
            <StatCard label="Urgent (7d)" value={urgentCount} color={urgentCount > 0 ? "#ef4444" : "#64748b"} icon={"\u{1F525}"} />
          </div>

          <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.04)", padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads by title, source, keywords, notes..." style={{ width: "100%", padding: "11px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Status</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["All", ...STATUSES].map(s => <FilterPill key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>County</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{COUNTIES.map(c => <FilterPill key={c} label={c} active={countyFilter === c} onClick={() => setCountyFilter(c)} />)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Assigned To</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["All", ...SALESMEN].map(s => <FilterPill key={s} label={s} active={assigneeFilter === s} onClick={() => setAssigneeFilter(s)} />)}</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Showing {filtered.length} of {pageLeads.length} leads</div>

          <div style={{ background: "rgba(15,23,42,0.4)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}><div style={{ fontSize: 24, marginBottom: 8 }}>{"\u23F3"}</div>Loading leads...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}><div style={{ fontSize: 24, marginBottom: 8 }}>{"\u{1F50D}"}</div>{pageLeads.length === 0 ? "No leads in this category yet" : "No leads match your filters"}</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["ID", "Type", "Lead", "County", "Closes", "Status", "Assigned"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}</tr></thead>
                  <tbody>{filtered.map(lead => <LeadRow key={lead.id} lead={lead} onOpen={setSelectedLead} />)}</tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} onSave={handleSaveLead} />}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdd={handleAddLead} />}
    </div>
  );
}
