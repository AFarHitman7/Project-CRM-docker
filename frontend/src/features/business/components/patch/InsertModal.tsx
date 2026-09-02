import { useEffect, useState } from "react";
import styles from "./InsertModal.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

type TaxType = "HST" | "CORPORATION" | "PAYROLL" | "WSIB" | "ANNUAL_RENEWAL";

interface BusinessTaxForm {
  taxYear: string;
  taxPeriod: string;
  amount: string;
  confirmationNumber: string;
  status: "PaperReceived" | "InProgress" | "ReadyForReview" | "FiledOn";
  taxDate: string;
  fromDate?: string;
  toDate?: string;
  notes?: string;
  preparedBy: string;
  slips?: string[];
  updateRenewal?: string;
}

interface Note {
  note: string;
  createdBy?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  taxProfiles: any[];
  onSuccess: () => void;
  user: any;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isValidSIN(sin: string): boolean {
  if (!/^\d{9}$/.test(sin)) return false;

  let sum = 0;
  let doubleDigit = false;

  for (let i = sin.length - 1; i >= 0; i--) {
    let digit = Number(sin[i]);

    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
}

function validateDateNotFuture(date: string): boolean {
  if (!date) return true;
  const selected = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected <= today;
}

function computeNextRenewalDate(startDate?: string | null): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const base = new Date(now.getFullYear(), 0, 1);
  for (let i = 0; i < 366; i++) {
    const y = base.getFullYear();
    const dt = new Date(y, d.getMonth(), d.getDate());
    dt.setHours(0, 0, 0, 0);
    if (dt >= now) {
      return dt;
    }
    base.setFullYear(y + 1);
  }
  return null;
}

export default function InsertBusinessResourceModal({
  visible,
  onClose,
  businessId,
  taxProfiles,
  onSuccess,
  user,
}: Props) {
  const [activeTab, setActiveTab] = useState<"tax" | "shareholders" | "notes">(
    "tax",
  );

  const [activeTaxTab, setActiveTaxTab] = useState<TaxType>("HST");
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [taxRecordCreated, setTaxRecordCreated] = useState(false);
  const [createdTaxRecordId, setCreatedTaxRecordId] = useState<string | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState<BusinessTaxForm>({
    taxYear: "",
    taxPeriod: "",
    amount: "",
    confirmationNumber: "",
    status: "InProgress",
    taxDate: "",
    fromDate: "",
    toDate: "",
    preparedBy: "",
    notes: "",
    slips: [],
    updateRenewal: "",
  });

  type ShareholderMode = "existing" | "new" | "basic";

  const [shareholderMode, setShareholderMode] =
    useState<ShareholderMode>("existing");

  const [shareholderForm, setShareholderForm] = useState<any>({
    client_id: "",
    first_name: "",
    last_name: "",
    dob: "",
    email: "",
    full_name: "",
    sin: "",
    share_percentage: "",
  });

  const [shareholderErrors, setShareholderErrors] = useState<any>({});

  const [noteForm, setNoteForm] = useState<Note>({
    note: "",
    createdBy: user?.id || "",
  });

  const [error, setError] = useState<string>("");

  const handleCreateShareholder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const errors: any = {};

    if (!shareholderForm.share_percentage) {
      errors.share_percentage = "Share percentage is required";
    } else if (
      Number(shareholderForm.share_percentage) <= 0 ||
      Number(shareholderForm.share_percentage) > 100
    ) {
      errors.share_percentage = "Share percentage must be between 0 and 100";
    }

    if (shareholderMode === "existing") {
      if (!shareholderForm.client_id) {
        errors.client_id = "Client ID is required";
      }
    }

    if (shareholderMode === "new") {
      if (!shareholderForm.first_name) {
        errors.first_name = "First name is required";
      }
      if (!shareholderForm.last_name) {
        errors.last_name = "Last name is required";
      }
      if (!shareholderForm.dob) {
        errors.dob = "Date of birth is required";
      } else if (!validateDateNotFuture(shareholderForm.dob)) {
        errors.dob = "Date of birth cannot be in the future";
      }
      if (!shareholderForm.sin) {
        errors.sin = "SIN is required";
      } else if (!isValidSIN(shareholderForm.sin)) {
        errors.sin = "Invalid SIN number";
      }
    }

    if (shareholderMode === "basic") {
      if (!shareholderForm.full_name) {
        errors.full_name = "Full name is required";
      }
      if (!shareholderForm.dob) {
        errors.dob = "Date of birth is required";
      } else if (!validateDateNotFuture(shareholderForm.dob)) {
        errors.dob = "Date of birth cannot be in the future";
      }
      if (!shareholderForm.sin) {
        errors.sin = "SIN is required";
      } else if (!isValidSIN(shareholderForm.sin)) {
        errors.sin = "Invalid SIN number";
      }
    }

    if (Object.keys(errors).length > 0) {
      setShareholderErrors(errors);
      return;
    }

    setShareholderErrors({});

    const token = localStorage.getItem("token");

    let payload: any = {
      share_percentage: Number(shareholderForm.share_percentage),
    };

    if (shareholderMode === "existing") {
      payload.client_id = shareholderForm.client_id;
    }

    if (shareholderMode === "new") {
      payload.personal_client = {
        first_name: shareholderForm.first_name,
        last_name: shareholderForm.last_name,
        dob: shareholderForm.dob,
        email: shareholderForm.email || null,
        sin: shareholderForm.sin,
      };
    }

    if (shareholderMode === "basic") {
      payload.full_name = shareholderForm.full_name;
      payload.dob = shareholderForm.dob;
      payload.sin = shareholderForm.sin;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/api/bClient/${businessId}/shareholders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create shareholder");
      }

      onSuccess();
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteForm.note) {
      return; // HTML5 validation will handle this
    }

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/bClient/${businessId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(noteForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add note");
      }

      setNoteForm({ note: "", createdBy: user?.id || "" });
      onSuccess();
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  function getEffectiveFrequency(profile: any, taxType: TaxType) {
    if (!profile) return null;
    if (taxType === "WSIB") return "quarterly";
    return String(profile.frequency).toLowerCase();
  }

  function toggleSlip(type: string) {
    setForm((f) => ({
      ...f,
      slips: f.slips?.includes(type)
        ? f.slips.filter((s) => s !== type)
        : [...(f.slips || []), type],
    }));
  }

  function getAvailableStatuses(taxType: TaxType): BusinessTaxForm["status"][] {
    switch (taxType) {
      case "ANNUAL_RENEWAL":
        return ["FiledOn"];
      case "PAYROLL":
      case "WSIB":
        return ["ReadyForReview", "FiledOn"];
      case "HST":
      case "CORPORATION":
      default:
        return ["PaperReceived", "InProgress", "ReadyForReview", "FiledOn"];
    }
  }

  useEffect(() => {
    if (!visible) return;

    const profile =
      taxProfiles.find((p) => p.tax_type === activeTaxTab) || null;

    const effectiveProfile = profile
      ? {
          ...profile,
          frequency: getEffectiveFrequency(profile, activeTaxTab),
        }
      : null;

    setActiveProfile(effectiveProfile);

    if (!profile) {
      setForm((f) => ({ ...f, taxPeriod: "" }));
      return;
    }

    setForm({
      taxYear: String(profile.start_year ?? ""),
      taxPeriod:
        effectiveProfile.frequency === "quarterly"
          ? `Q${profile.start_quarter ?? 1}`
          : effectiveProfile.frequency === "monthly"
            ? ""
            : "",
      amount: "",
      confirmationNumber: "",
      status: activeTaxTab === "ANNUAL_RENEWAL" ? "FiledOn" : "InProgress",
      taxDate: "",
      preparedBy: "",
      fromDate: "",
      toDate: "",
      notes: "",
      slips: [],
      updateRenewal: "",
    });
  }, [activeTaxTab, taxProfiles, visible]);

  useEffect(() => {
    if (activeTaxTab === "ANNUAL_RENEWAL" && form.updateRenewal) {
      const year = new Date(form.updateRenewal).getFullYear();
      if (!isNaN(year) && form.taxYear !== String(year)) {
        setForm((prev) => ({ ...prev, taxYear: String(year) }));
      }
    }
  }, [activeTaxTab, form.updateRenewal, form.taxYear]);

  const resetForm = () => {
    setForm({
      taxYear: "",
      taxPeriod: "",
      amount: "",
      confirmationNumber: "",
      status: "InProgress",
      taxDate: "",
      fromDate: "",
      toDate: "",
      preparedBy: "",
      notes: "",
      slips: [],
      updateRenewal: "",
    });
    setTaxRecordCreated(false);
    setCreatedTaxRecordId(null);
    setSelectedFile(null);
    setError("");
    setShareholderErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!activeProfile) {
      setError("No tax profile exists for this tax type");
      return;
    }

    if (activeTaxTab !== "ANNUAL_RENEWAL" && !form.taxYear) {
      setError("Tax year is required");
      return;
    }

    if (
      activeTaxTab !== "ANNUAL_RENEWAL" &&
      (form.status === "FiledOn" || form.status === "ReadyForReview")
    ) {
      if (!form.amount) {
        setError("Amount is required for this status");
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const payload = {
        tax_type: activeTaxTab,
        tax_year: Number(form.taxYear),
        tax_date: form.taxDate || null,
        tax_period:
          activeProfile.frequency === "yearly" ? null : form.taxPeriod || null,
        amount: form.amount !== "" ? Number(form.amount) : null,
        confirmation_number: form.confirmationNumber || null,
        status: form.status,
        from_date: form.fromDate || null,
        to_date: form.toDate || null,
        note: form.notes || null,
        prepared_by: form.preparedBy || null,
        slip_information:
          form.slips && form.slips.length > 0 ? form.slips : null,
        update_renewal: form.updateRenewal || null,
      };

      const res = await fetch(
        `${API_URL}/api/bClient/${businessId}/tax-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create tax record");
      }

      const data = await res.json();

      console.log("Created tax record:", data.id);

      // If status is FiledOn and not ANNUAL_RENEWAL, show upload page
      if (form.status === "FiledOn" && activeTaxTab !== "ANNUAL_RENEWAL") {
        setCreatedTaxRecordId(data.id);
        setTaxRecordCreated(true);
      } else {
        // Otherwise, close modal and refresh
        onSuccess();
        handleClose();
      }
    } catch (e: any) {
      setError(e.message || "Failed to create tax record");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipUpload = () => {
    onSuccess();
    handleClose();
  };

  const handleUploadDocument = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile || !createdTaxRecordId) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("uploaded_by", user?.id || "");
      formData.append("notes", "Initial filing");
      formData.append("businessId", businessId);

      const res = await fetch(`${API_URL}/api/hst-docs/${createdTaxRecordId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload document");
      }

      onSuccess();
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  function getButtonProps() {
    if (activeTab === "notes") {
      return {
        type: "submit" as const,
        form: "note-form",
        label: "Add Note",
        onClick: undefined,
      };
    }

    if (activeTab === "shareholders") {
      return {
        type: "submit" as const,
        form: "shareholder-form",
        label: "Add Shareholder",
        onClick: undefined,
      };
    }

    if (taxRecordCreated) {
      if (form.status === "FiledOn") {
        return {
          type: "submit" as const,
          form: "upload-form",
          label: "Upload Document",
          onClick: undefined,
        };
      }
      return {
        type: "button" as const,
        form: undefined,
        label: "Done",
        onClick: () => {
          onSuccess();
          handleClose();
        },
      };
    }

    return {
      type: "submit" as const,
      form: "tax-form",
      label: "Create Tax Record",
      onClick: undefined,
    };
  }

  const buttonProps = getButtonProps();

  if (!visible) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Insert Business Data</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        <div className={styles.tabs}>
          <button
            className={activeTab === "tax" ? styles.activeTab : ""}
            onClick={() => {
              setActiveTab("tax");
              setError("");
            }}
          >
            Tax Record
          </button>

          <button
            className={activeTab === "shareholders" ? styles.activeTab : ""}
            onClick={() => {
              setActiveTab("shareholders");
              setError("");
              setShareholderErrors({});
            }}
          >
            Shareholders
          </button>

          <button
            className={activeTab === "notes" ? styles.activeTab : ""}
            onClick={() => {
              setActiveTab("notes");
              setError("");
            }}
          >
            Notes
          </button>
        </div>

        <div className={styles.modalBody}>
          {activeTab === "tax" && (
            <div className={styles.tabContent}>
              {!taxRecordCreated ? (
                <>
                  <div className={styles.tabs}>
                    {(
                      [
                        "HST",
                        "CORPORATION",
                        "PAYROLL",
                        "WSIB",
                        "ANNUAL_RENEWAL",
                      ] as TaxType[]
                    )
                      .filter((t) =>
                        taxProfiles.some(
                          (p) =>
                            p.tax_type === t && p.registeredstatus === true,
                        ),
                      )
                      .map((t) => (
                        <button
                          key={t}
                          className={activeTaxTab === t ? styles.activeTab : ""}
                          onClick={() => {
                            setActiveTaxTab(t);
                            setError("");
                          }}
                        >
                          {t.replace(/_/g, " ")}
                        </button>
                      ))}
                  </div>
                  {!activeProfile ? (
                    <div className={styles.emptyState}>
                      No tax profile exists for {activeTaxTab}.
                    </div>
                  ) : (
                    <form
                      id="tax-form"
                      className={styles.form}
                      onSubmit={handleSubmit}
                    >
                      <h3>{activeTaxTab.replace(/_/g, " ")} Tax Record</h3>

                      {activeTaxTab === "HST" && (
                        <>
                          <div className={styles.formField}>
                            <label>Frequency</label>
                            <input value={activeProfile.frequency} disabled />
                          </div>

                          <div className={styles.formField}>
                            <label>Tax Year *</label>
                            <input
                              value={form.taxYear}
                              required
                              onChange={(e) =>
                                setForm({ ...form, taxYear: e.target.value })
                              }
                            />
                          </div>

                          {activeProfile.frequency === "monthly" && (
                            <div className={styles.formField}>
                              <label>Month *</label>
                              <select
                                value={form.taxPeriod}
                                required
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    taxPeriod: e.target.value,
                                  })
                                }
                              >
                                <option value="" disabled>
                                  Select a Month
                                </option>
                                {MONTHS.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {activeProfile.frequency === "quarterly" && (
                            <div className={styles.formField}>
                              <label>Quarter</label>
                              <select
                                value={form.taxPeriod}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    taxPeriod: e.target.value,
                                  })
                                }
                              >
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                              </select>
                            </div>
                          )}

                          <div className={styles.formField}>
                            <label>From Date *</label>
                            <input
                              type="date"
                              value={form.fromDate}
                              required
                              onChange={(e) =>
                                setForm({ ...form, fromDate: e.target.value })
                              }
                            />
                          </div>

                          <div className={styles.formField}>
                            <label>To Date *</label>
                            <input
                              type="date"
                              value={form.toDate}
                              required
                              onChange={(e) =>
                                setForm({ ...form, toDate: e.target.value })
                              }
                            />
                          </div>
                        </>
                      )}

                      {activeTaxTab === "CORPORATION" && (
                        <>
                          <div className={styles.formField}>
                            <label>Frequency</label>
                            <input value="Annual" disabled />
                          </div>

                          <div className={styles.formField}>
                            <label>Tax Year *</label>
                            <input
                              value={form.taxYear}
                              required
                              onChange={(e) =>
                                setForm({ ...form, taxYear: e.target.value })
                              }
                            />
                          </div>
                        </>
                      )}

                      {activeTaxTab === "PAYROLL" && (
                        <>
                          <div className={styles.formField}>
                            <label>Tax Year *</label>
                            <input
                              value={form.taxYear}
                              required
                              onChange={(e) =>
                                setForm({ ...form, taxYear: e.target.value })
                              }
                            />
                          </div>

                          <div className={styles.formField}>
                            <label>Slip Information</label>
                            <div>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={form.slips?.includes("T4")}
                                  onChange={() => toggleSlip("T4")}
                                />{" "}
                                T4
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={form.slips?.includes("T5")}
                                  onChange={() => toggleSlip("T5")}
                                />{" "}
                                T5
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={form.slips?.includes("T4A")}
                                  onChange={() => toggleSlip("T4A")}
                                />{" "}
                                T4A
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      {activeTaxTab === "WSIB" && (
                        <>
                          <div className={styles.formField}>
                            <label>Frequency</label>
                            <input value="Quarterly" disabled />
                          </div>

                          <div className={styles.formField}>
                            <label>Quarter</label>
                            <select
                              value={form.taxPeriod}
                              onChange={(e) =>
                                setForm({ ...form, taxPeriod: e.target.value })
                              }
                            >
                              <option value="Q1">Q1</option>
                              <option value="Q2">Q2</option>
                              <option value="Q3">Q3</option>
                              <option value="Q4">Q4</option>
                            </select>
                          </div>

                          <div className={styles.formField}>
                            <label>Tax Year *</label>
                            <input
                              value={form.taxYear}
                              required
                              onChange={(e) =>
                                setForm({ ...form, taxYear: e.target.value })
                              }
                            />
                          </div>
                        </>
                      )}

                      {activeTaxTab === "ANNUAL_RENEWAL" && (
                        <>
                          <div className={styles.formField}>
                            <label>Current Renewal Date</label>
                            <input
                              value={
                                activeProfile.start_date
                                  ? (() => {
                                      const next = computeNextRenewalDate(
                                        activeProfile.start_date,
                                      );
                                      return next
                                        ? next.toLocaleDateString("en-CA")
                                        : "";
                                    })()
                                  : ""
                              }
                              disabled
                            />
                          </div>

                          <div className={styles.formField}>
                            <label>Update Renewal Date</label>
                            <input
                              type="date"
                              value={form.updateRenewal}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  updateRenewal: e.target.value,
                                })
                              }
                            />
                          </div>
                        </>
                      )}

                      <div className={styles.formField}>
                        <label>Status</label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              status: e.target
                                .value as BusinessTaxForm["status"],
                            })
                          }
                        >
                          {getAvailableStatuses(activeTaxTab).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(form.status === "FiledOn" ||
                        form.status === "ReadyForReview") &&
                        activeTaxTab !== "ANNUAL_RENEWAL" && (
                          <div className={styles.formField}>
                            <label>Amount *</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={form.amount}
                              onChange={(e) =>
                                setForm({ ...form, amount: e.target.value })
                              }
                            />
                          </div>
                        )}

                      {form.status === "FiledOn" &&
                        activeTaxTab !== "ANNUAL_RENEWAL" && (
                          <div className={styles.formField}>
                            <label>Confirmation Number</label>
                            <input
                              value={form.confirmationNumber}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  confirmationNumber: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}

                      {form.status === "FiledOn" &&
                        activeTaxTab !== "ANNUAL_RENEWAL" && (
                          <div className={styles.formField}>
                            <label>Filing Date *</label>
                            <input
                              type="date"
                              value={form.taxDate}
                              required
                              max={new Date().toISOString().split("T")[0]}
                              onChange={(e) =>
                                setForm({ ...form, taxDate: e.target.value })
                              }
                            />
                          </div>
                        )}

                      <div className={styles.formField}>
                        <label>Prepared By *</label>
                        <input
                          value={form.preparedBy}
                          required
                          onChange={(e) =>
                            setForm({ ...form, preparedBy: e.target.value })
                          }
                        />
                      </div>

                      <div className={styles.formField}>
                        <label>Notes</label>
                        <textarea
                          value={form.notes}
                          onChange={(e) =>
                            setForm({ ...form, notes: e.target.value })
                          }
                        />
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className={styles.form}>
                  {form.status === "FiledOn" ? (
                    <form id="upload-form" onSubmit={handleUploadDocument}>
                      <h3>Upload Filing Document</h3>
                      <div className={styles.formField}>
                        <label>PDF Attachment *</label>
                        <input
                          type="file"
                          required
                          accept="application/pdf"
                          onChange={(e) =>
                            e.target.files && setSelectedFile(e.target.files[0])
                          }
                        />
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3>Tax Record Created Successfully</h3>
                      <p>
                        The tax record has been created. You can close this
                        dialog now.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "shareholders" && (
            <div className={styles.tabContent}>
              <form
                id="shareholder-form"
                className={styles.form}
                onSubmit={handleCreateShareholder}
              >
                <h3>Add Shareholder</h3>

                <div className={styles.formField}>
                  <label>Type</label>
                  <select
                    value={shareholderMode}
                    onChange={(e) =>
                      setShareholderMode(e.target.value as ShareholderMode)
                    }
                  >
                    <option value="existing">Existing Client</option>
                    <option value="new">New Personal Client</option>
                    <option value="basic">Basic Details Only</option>
                  </select>
                </div>

                {shareholderMode === "existing" && (
                  <div className={styles.formField}>
                    <label>Client ID *</label>
                    <input
                      placeholder="Client UUID"
                      value={shareholderForm.client_id}
                      required
                      onChange={(e) =>
                        setShareholderForm({
                          ...shareholderForm,
                          client_id: e.target.value,
                        })
                      }
                    />
                    {shareholderErrors.client_id && (
                      <div className={styles.errorText} role="alert">
                        {shareholderErrors.client_id}
                      </div>
                    )}
                  </div>
                )}

                {shareholderMode === "new" && (
                  <>
                    <div className={styles.formField}>
                      <label>First Name *</label>
                      <input
                        value={shareholderForm.first_name}
                        required
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            first_name: e.target.value,
                          })
                        }
                      />
                      {shareholderErrors.first_name && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.first_name}
                        </div>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Last Name *</label>
                      <input
                        value={shareholderForm.last_name}
                        required
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            last_name: e.target.value,
                          })
                        }
                      />
                      {shareholderErrors.last_name && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.last_name}
                        </div>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Date of Birth *</label>
                      <input
                        type="date"
                        value={shareholderForm.dob}
                        required
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            dob: e.target.value,
                          })
                        }
                      />
                      {shareholderErrors.dob && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.dob}
                        </div>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>SIN *</label>
                      <input
                        inputMode="numeric"
                        placeholder="9-digit SIN"
                        value={shareholderForm.sin}
                        required
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            sin: e.target.value.replace(/\D/g, ""),
                          })
                        }
                      />
                      {shareholderErrors.sin && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.sin}
                        </div>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Email</label>
                      <input
                        type="email"
                        value={shareholderForm.email}
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {shareholderMode === "basic" && (
                  <>
                    <div className={styles.formField}>
                      <label>Full Name *</label>
                      <input
                        value={shareholderForm.full_name}
                        required
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            full_name: e.target.value,
                          })
                        }
                      />
                      {shareholderErrors.full_name && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.full_name}
                        </div>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>Date of Birth *</label>
                      <input
                        type="date"
                        value={shareholderForm.dob}
                        required
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            dob: e.target.value,
                          })
                        }
                      />
                      {shareholderErrors.dob && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.dob}
                        </div>
                      )}
                    </div>

                    <div className={styles.formField}>
                      <label>SIN *</label>
                      <input
                        inputMode="numeric"
                        placeholder="9-digit SIN"
                        value={shareholderForm.sin}
                        required
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            sin: e.target.value.replace(/\D/g, ""),
                          })
                        }
                      />
                      {shareholderErrors.sin && (
                        <div className={styles.errorText} role="alert">
                          {shareholderErrors.sin}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className={styles.formField}>
                  <label>Share Percentage *</label>
                  <input
                    type="number"
                    max={100}
                    step="0.01"
                    required
                    value={shareholderForm.share_percentage}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (Number(v) > 100) return;
                      setShareholderForm({
                        ...shareholderForm,
                        share_percentage: v,
                      });
                    }}
                  />
                  {shareholderErrors.share_percentage && (
                    <div className={styles.errorText} role="alert">
                      {shareholderErrors.share_percentage}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeTab === "notes" && (
            <div className={styles.tabContent}>
              <form
                id="note-form"
                className={styles.form}
                onSubmit={handleAddNote}
              >
                <h3>Add New Note</h3>
                <div className={styles.formRow}>
                  <div
                    className={`${styles.formField} ${styles.textAreaField}`}
                  >
                    <textarea
                      placeholder="Write your note here"
                      className={styles.notesArea}
                      value={noteForm.note}
                      required
                      onChange={(e) =>
                        setNoteForm({ ...noteForm, note: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>

          {activeTab === "tax" &&
            taxRecordCreated &&
            form.status !== "FiledOn" && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSkipUpload}
                disabled={loading}
              >
                Skip for now
              </button>
            )}

          <button
            type={buttonProps.type}
            form={buttonProps.form}
            className={styles.submitButton}
            onClick={buttonProps.onClick}
            disabled={loading}
          >
            {loading ? "Processing…" : buttonProps.label}
          </button>
        </div>
      </div>
    </div>
  );
}
