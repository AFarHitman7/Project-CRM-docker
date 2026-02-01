import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type BulkResult = { created: number; failed: number; errors?: any[] };

export type BusinessBulkUploadModalProps = {
  visible: boolean;
  onClose: (result?: BulkResult) => void;
  apiUrl: string;
  defaultCreatedBy?: string;
};

export default function BulkUpload({
  visible,
  onClose,
  apiUrl,
  defaultCreatedBy,
}: BusinessBulkUploadModalProps) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setRows(null);
      setError(null);
      setUploading(false);
      setPreviewCount(null);
    }
  }, [visible]);

  function rowToBusiness(row: any) {
    const business: any = {
      businessName: row.businessName?.trim(),
      businessType: row.businessType?.trim(),
      email: row.email?.trim(),
      businessNumber: row.businessNumber || null,
      incorporationDate: row["incorporationDate (YYYY-MM-DD)"] || null,
      incorporationJurisdiction: row.incorporationJurisdiction || null,
      fiscalYearEnd: row["fiscalYearEnd (MM-DD)"] || null,
      ontarioCorpNumber: row.ontarioCorpNumber || null,
      contactName: row.contactName || null,
      phone1: row.phone1 || null,
      phone2: row.phone2 || null,
      phone3: row.phone3 || null,
      fax: row.fax || null,
      loyaltySince: row["loyaltySince (YYYY-MM-DD)"] || null,
      referredBy: row.referredBy || null,
      loyalty: row.loyalty || null,
      createdBy: row.createdBy || defaultCreatedBy || null,
      addresses: [],
      notes: [],
    };

    // Primary address
    if (row.line1 || row.city) {
      business.addresses.push({
        line1: row.line1 || "",
        line2: row.line2 || "",
        city: row.city || "",
        province: row.province || "",
        postalCode: row.postalCode || "",
        country: row.country || "Canada",
      });
    }

    // Notes
    if (row.notes && row.notes.trim()) {
      business.notes = [row.notes];
    }

    // Tax profiles
    business.hstStatus = row.hstStatus === "TRUE" || row.hstStatus === true;
    business.hstFrequency = row.hstFrequency || "quarterly";

    business.payrollStatus =
      row.payrollStatus === "TRUE" || row.payrollStatus === true;

    business.wsibStatus = row.wsibStatus === "TRUE" || row.wsibStatus === true;

    return business;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const raw = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (!raw.length) {
        setError("Excel sheet is empty");
        return;
      }

      // Filter out the description row (contains "Required" or "Optional")
      const filtered = raw.filter((row: any) => {
        const businessName = row.businessName || "";
        // Skip if businessName is "Required" or contains "Optional" (description row)
        return (
          businessName !== "Required" &&
          !businessName.includes("Optional") &&
          businessName.trim() !== ""
        );
      });

      if (!filtered.length) {
        setError("No valid business data found in Excel sheet");
        return;
      }

      const compiled = filtered.map(rowToBusiness);
      setRows(compiled);
      setPreviewCount(compiled.length);
    } catch {
      setError("Failed to read XLSX file");
    }
  }

  async function handleUpload() {
    if (!rows || rows.length === 0) {
      setError("No data loaded");
      return;
    }

    const validationErrors: { row: number; reason: string }[] = [];

    rows.forEach((b, i) => {
      if (!b.businessName || !b.businessType || !b.email) {
        validationErrors.push({
          row: i + 2,
          reason: "Missing businessName, businessType, or email",
        });
      }
    });

    if (validationErrors.length > 0) {
      const v = validationErrors[0];
      setError(`Validation failed at row ${v.row}: ${v.reason}`);
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint = `${apiUrl.replace(/\/$/, "")}/api/bClient/bulk/`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(rows),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || `Upload failed (${res.status})`);
      }

      const result = await res.json().catch(() => ({}));
      onClose({
        created: result.created ?? rows.length,
        failed: result.failed ?? 0,
        errors: result.errors,
      });
    } catch (e: any) {
      setError(e.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <strong>Business Bulk Upload (XLSX)</strong>
          <button onClick={() => onClose()} style={iconButtonStyle}>
            ✕
          </button>
        </div>

        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          style={{ marginBottom: 12 }}
        />

        {previewCount != null && (
          <div style={{ fontSize: 12 }}>{previewCount} businesses loaded</div>
        )}

        <div style={metaRowStyle}>
          <button onClick={() => onClose()} style={secondaryButtonStyle}>
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={primaryButtonStyle}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
      </div>
    </div>
  );
}

/* styles */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: "min(900px, 94vw)",
  background: "#fff",
  borderRadius: 8,
  padding: 16,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 12,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#0b66ff",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  color: "#333",
  padding: "6px 12px",
  borderRadius: 6,
  background: "#fff",
};

const iconButtonStyle: React.CSSProperties = {
  color: "#333",
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  color: "#b00020",
  background: "#fdecea",
  padding: 8,
  borderRadius: 6,
};
