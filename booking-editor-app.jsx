import { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";

// ── Background presets ─────────────────────────────────────────────────────────
const BG_PRESETS = [
  {
    name: "Default",
    value: "",
    preview: "linear-gradient(-40deg,#e8eeff,#edf3ff,#f0ebff,#e4f0ff,#eafcf3)",
  },
  {
    name: "White",
    value: "#ffffff",
    preview: "#ffffff",
  },
  {
    name: "Slate",
    value: "#f1f5f9",
    preview: "#f1f5f9",
  },
  {
    name: "Ocean",
    value: "linear-gradient(135deg,#1CB5E0 0%,#000851 100%)",
    preview: "linear-gradient(135deg,#1CB5E0 0%,#000851 100%)",
  },
  {
    name: "Sunset",
    value: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
    preview: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
  },
  {
    name: "Forest",
    value: "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)",
    preview: "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)",
  },
  {
    name: "Night",
    value: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
    preview: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
  },
  {
    name: "Sand",
    value: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)",
    preview: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)",
  },
  {
    name: "Mint",
    value: "linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)",
    preview: "linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)",
  },
  {
    name: "Lavender",
    value: "linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)",
    preview: "linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)",
  },
];

// ── Tiny fetch helper (uses session cookie) ────────────────────────────────────
async function apiFetch(url, options = {}) {
  const { method = "GET", body } = options;
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// ── Main editor component ──────────────────────────────────────────────────────
function BookingEditor() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");

  // Editor form state
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [sidebarMessage, setSidebarMessage] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [brandBgColor, setBrandBgColor] = useState("");

  // Username + slug for the preview iframe
  const [previewBase, setPreviewBase] = useState("");

  const iframeRef = useRef(null);
  const [previewKey, setPreviewKey] = useState(0);

  // ── Load event type ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) {
      setFetchError("No event type ID provided. Close this window and try again.");
      setLoading(false);
      return;
    }
    apiFetch(`/api/event-types/${eventId}`)
      .then((data) => {
        const et = data.eventType || {};
        setBrandLogoUrl(et.brand_logo_url || et.brandLogoUrl || "");
        setBrandTagline(et.brand_tagline || et.brandTagline || "");
        setSidebarMessage(et.sidebar_message || et.sidebarMessage || "");
        setColor(et.color || "#2563eb");
        setBrandBgColor(et.brand_bg_color || et.brandBgColor || "");
        // Build preview base path — we need the user's username and slug
        if (et.username && et.slug) {
          setPreviewBase(`/${et.username}/${et.slug}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message || "Failed to load event type.");
        setLoading(false);
      });
  }, [eventId]);

  // ── Build iframe preview URL ─────────────────────────────────────────────────
  function buildPreviewUrl() {
    if (!previewBase) return "";
    const q = new URLSearchParams();
    q.set("_preview", "1");
    q.set("_logo", brandLogoUrl);
    q.set("_tagline", brandTagline);
    q.set("_color", color);
    q.set("_bg", brandBgColor);
    return `${previewBase}?${q.toString()}`;
  }

  const refreshPreview = useCallback(() => setPreviewKey((k) => k + 1), []);

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!eventId) return;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      await apiFetch(`/api/event-types/${eventId}`, {
        method: "PATCH",
        body: { brandLogoUrl, brandTagline, sidebarMessage, color, brandBgColor },
      });
      setNotice("Saved! Refreshing preview…");
      setTimeout(() => {
        refreshPreview();
        setNotice("");
      }, 800);
    } catch (err) {
      setSaveError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: 14 }}>
        Loading event type…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "#dc2626", fontSize: 14, padding: 24 }}>
        <div style={{ fontWeight: 600 }}>Error</div>
        <div>{fetchError}</div>
        <a href="/dashboard" style={{ color: "#2563eb", textDecoration: "underline", fontSize: 13 }}>Back to dashboard</a>
      </div>
    );
  }

  const previewUrl = buildPreviewUrl();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 56, flexShrink: 0,
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(15,23,42,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => window.close()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
              background: "#f8fafc", cursor: "pointer", fontSize: 16, color: "#64748b",
            }}
            title="Close editor"
          >
            ×
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Booking Page Editor</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {notice && (
            <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>{notice}</span>
          )}
          {saveError && (
            <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 500 }}>{saveError}</span>
          )}
          <button
            onClick={refreshPreview}
            style={{
              height: 36, padding: "0 14px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#f8fafc",
              cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 500,
            }}
          >
            Refresh Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 36, padding: "0 18px", borderRadius: 8,
              border: "none", background: saving ? "#93c5fd" : "#2563eb",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 13, color: "#fff", fontWeight: 600,
              transition: "background 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left controls panel ── */}
        <aside style={{
          width: 340, flexShrink: 0, overflowY: "auto",
          background: "#fff", borderRight: "1px solid #e2e8f0",
          padding: "20px 18px",
          display: "flex", flexDirection: "column", gap: 24,
        }}>

          {/* Logo */}
          <section>
            <Label>Company Logo URL</Label>
            <input
              type="url"
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              placeholder="https://yourcompany.com/logo.png"
              style={inputStyle}
            />
            {brandLogoUrl && (
              <div style={{ marginTop: 10, padding: 8, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", display: "inline-flex" }}>
                <img
                  src={brandLogoUrl}
                  alt="Logo preview"
                  style={{ maxHeight: 48, maxWidth: 160, objectFit: "contain", borderRadius: 4 }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
            <Hint>Appears at the top of the booking sidebar. Use a transparent PNG for best results.</Hint>
          </section>

          {/* Tagline */}
          <section>
            <Label>Tagline (below logo)</Label>
            <input
              type="text"
              value={brandTagline}
              onChange={(e) => setBrandTagline(e.target.value)}
              placeholder="e.g. Experts in digital strategy"
              maxLength={200}
              style={inputStyle}
            />
            <Hint>Short line of text shown beneath the company logo on the booking page.</Hint>
          </section>

          {/* Accent color */}
          <section>
            <Label>Accent / Brand Color</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: 44, height: 44, border: "1px solid #e2e8f0", borderRadius: 8,
                  cursor: "pointer", padding: 2, background: "#fff",
                }}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v);
                }}
                maxLength={7}
                style={{ ...inputStyle, marginTop: 0, width: 100, fontFamily: "monospace", fontSize: 13 }}
              />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Calendar, buttons, highlights</span>
            </div>
          </section>

          {/* Background */}
          <section>
            <Label>Page Background</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 8 }}>
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setBrandBgColor(preset.value)}
                  title={preset.name}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 10,
                    background: preset.preview,
                    border: brandBgColor === preset.value
                      ? "3px solid #2563eb"
                      : "2px solid #e2e8f0",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color 0.15s",
                  }}
                >
                  {preset.name === "Default" && brandBgColor === "" && (
                    <span style={{
                      position: "absolute", inset: 0, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              {BG_PRESETS.map((p) => p.value === brandBgColor ? (
                <span key={p.name} style={{ fontSize: 12, color: "#475569" }}>Selected: <strong>{p.name}</strong></span>
              ) : null)}
            </div>
            <Hint>Choose a gradient or solid color for the booking page background.</Hint>
          </section>

          {/* Sidebar message */}
          <section>
            <Label>Sidebar Message</Label>
            <textarea
              value={sidebarMessage}
              onChange={(e) => setSidebarMessage(e.target.value)}
              placeholder="Add a short welcome note or instructions for your guests…"
              maxLength={1000}
              rows={4}
              style={{ ...inputStyle, height: "auto", resize: "vertical", lineHeight: 1.6 }}
            />
            <Hint>Optional message shown in the booking sidebar below the event description.</Hint>
          </section>

        </aside>

        {/* ── Right: iframe preview ── */}
        <main style={{ flex: 1, overflow: "hidden", background: "#e2e8f0", display: "flex", flexDirection: "column" }}>
          <div style={{
            padding: "8px 14px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0",
            fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontWeight: 500 }}>Live Preview</span>
            {previewBase ? (
              <span style={{ opacity: 0.7 }}>{previewBase}</span>
            ) : (
              <span style={{ color: "#f59e0b" }}>Preview unavailable — username or slug missing</span>
            )}
            <span style={{ marginLeft: "auto", opacity: 0.6 }}>Save changes to persist, then refresh to see them on the live booking page.</span>
          </div>
          {previewBase ? (
            <iframe
              key={previewKey}
              ref={iframeRef}
              src={previewUrl}
              title="Booking page preview"
              style={{ flex: 1, border: "none", width: "100%", background: "#fff" }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
              Preview not available for this event type.
            </div>
          )}
        </main>

      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return (
    <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 5, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

const inputStyle = {
  display: "block", width: "100%", height: 40,
  padding: "0 12px", marginTop: 4,
  borderRadius: 8, border: "1px solid #e2e8f0",
  background: "#fff", color: "#0f172a", fontSize: 13,
  outline: "none", transition: "border-color 0.15s",
};

// ── Mount ──────────────────────────────────────────────────────────────────────
const root = createRoot(document.getElementById("root"));
root.render(<BookingEditor />);
