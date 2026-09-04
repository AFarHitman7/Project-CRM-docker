import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./BusinessPatchModal.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

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

function getEffectiveFrequency(profile: any, taxType: string) {
  if (!profile) return null;
  if (taxType === "WSIB") return "quarterly";
  return String(profile.frequency).toLowerCase();
}

// Helper function to get available statuses based on tax type
function getAvailableStatuses(taxType: string): string[] {
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

interface TaxForm {
  taxYear: number | "";
  taxPeriod: string;
  amount: string;
  taxDate: string;
  status: string;
  confirmationNumber: string;
  preparedBy: string;
  fromDate: string;
  toDate: string;
  updateRenewal: string;
}

export default function EditTaxModal({
  visible,
  onClose,
  taxRecord,
  businessId,
  taxProfiles,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  taxRecord: any | null;
  businessId: string;
  taxProfiles: any[];
  onSaved?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<TaxForm>({
    mode: "onTouched",
  });

  const [activeProfile, setActiveProfile] = useState<any>(null);

  // Watch status for conditional field visibility
  const currentStatus = watch("status");

  // Helper to safely format dates for inputs (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().slice(0, 10);
  };

  /* ---------- RESOLVE TAX PROFILE ---------- */
  useEffect(() => {
    if (!visible || !taxRecord) return;

    const profile =
      taxProfiles.find((p) => p.tax_type === taxRecord.tax_type) || null;

    const effectiveProfile = profile
      ? {
          ...profile,
          frequency: getEffectiveFrequency(profile, taxRecord.tax_type),
        }
      : null;

    setActiveProfile(effectiveProfile);
  }, [visible, taxRecord, taxProfiles]);

  /* ---------- PREFILL ---------- */
  useEffect(() => {
    if (!visible || !taxRecord || !activeProfile) return;

    reset({
      taxYear: taxRecord.tax_year ?? "",
      taxPeriod:
        activeProfile.frequency === "yearly" ? "" : taxRecord.tax_period ?? "",
      amount: taxRecord.amount ?? "",
      taxDate: formatDateForInput(taxRecord.tax_date),
      status: taxRecord.status ?? "",
      confirmationNumber: taxRecord.confirmation_number ?? "",
      preparedBy: taxRecord.prepared_by ?? "",
      fromDate: formatDateForInput(taxRecord.from_date),
      toDate: formatDateForInput(taxRecord.to_date),
      updateRenewal: formatDateForInput(taxRecord.update_renewal),
    });
  }, [visible, taxRecord, activeProfile, reset]);

  if (!visible || !taxRecord) return null;

  const isAnnualRenewal = taxRecord.tax_type === "ANNUAL_RENEWAL";
  const isHstQuarterly =
    taxRecord.tax_type === "HST" && activeProfile?.frequency === "quarterly";

  /* ---------- BUILD PATCH PAYLOAD ---------- */
  function buildPatchPayload(data: TaxForm) {
    const payload: Record<string, any> = {};

    // 1. Basic Fields
    if (data.taxYear !== taxRecord.tax_year) {
      payload.tax_year = data.taxYear === "" ? null : Number(data.taxYear);
    }

    // Amount Logic
    const newAmount = data.amount ? Number(data.amount) : null;
    const oldAmount = taxRecord.amount ? Number(taxRecord.amount) : null;
    if (newAmount !== oldAmount) {
      payload.amount = newAmount;
    }

    if (data.status !== taxRecord.status) {
      payload.status = data.status;
    }

    if (data.preparedBy !== (taxRecord.prepared_by ?? "")) {
      payload.prepared_by = data.preparedBy || null;
    }

    // Confirmation Logic
    const newConf = data.confirmationNumber || null;
    const oldConf = taxRecord.confirmation_number || null;
    if (newConf !== oldConf) {
      payload.confirmation_number = newConf;
    }

    // 2. Date Fields
    const compareDate = (
      inputDate: string,
      dbDate: string | null,
      field: string
    ) => {
      const formattedDb = dbDate
        ? new Date(dbDate).toISOString().slice(0, 10)
        : "";
      if (inputDate !== formattedDb) {
        payload[field] = inputDate || null;
      }
    };

    compareDate(data.taxDate, taxRecord.tax_date, "tax_date");
    compareDate(data.fromDate, taxRecord.from_date, "from_date");
    compareDate(data.toDate, taxRecord.to_date, "to_date");
    compareDate(data.updateRenewal, taxRecord.update_renewal, "update_renewal");

    /* ----- PERIOD LOGIC ----- */
    if (activeProfile.frequency === "yearly") {
      if (taxRecord.tax_period !== null) {
        payload.tax_period = null;
      }
    } else {
      const newPeriod = data.taxPeriod || null;
      const oldPeriod = taxRecord.tax_period ?? null;
      if (newPeriod !== oldPeriod) {
        payload.tax_period = newPeriod;
      }
    }

    return payload;
  }

  /* ---------- SUBMIT ---------- */
  const onSubmit = async (data: TaxForm) => {
    const payload = buildPatchPayload(data);

    if (!Object.keys(payload).length) {
      onClose();
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/bclient/${businessId}/tax-records/${taxRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("patch_failed");

      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e.message || "save_failed");
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Edit Tax Record</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.modalBody}>
            <div className={styles.formSection}>
              {/* Row 1: Tax Year & Amount (Conditionally Rendered) */}
              <div className={styles.formRow}>
                {!isAnnualRenewal && (
                  <div className={styles.formField}>
                    <label>Tax Year</label>
                    <input
                      type="number"
                      {...register("taxYear", { required: true })}
                    />
                  </div>
                )}

                {/* SHOW AMOUNT ONLY IF FiledOn OR ReadyForReview AND NOT Annual Renewal */}
                {(currentStatus === "FiledOn" ||
                  currentStatus === "ReadyForReview") &&
                  !isAnnualRenewal && (
                    <div className={styles.formField}>
                      <label>Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register("amount", { required: true })}
                      />
                    </div>
                  )}
              </div>

              {/* Row 2: Prepared By & Period */}
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Prepared By</label>
                  <input type="text" {...register("preparedBy")} />
                </div>

                {activeProfile?.frequency === "quarterly" &&
                  !isAnnualRenewal && (
                    <div className={styles.formField}>
                      <label>Quarter</label>
                      <select {...register("taxPeriod")}>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                      </select>
                    </div>
                  )}

                {activeProfile?.frequency === "monthly" && !isAnnualRenewal && (
                  <div className={styles.formField}>
                    <label>Month</label>
                    <select {...register("taxPeriod")}>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 3: HST Quarterly Specific Dates */}
              {isHstQuarterly && (
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>From Date</label>
                    <input type="date" {...register("fromDate")} />
                  </div>
                  <div className={styles.formField}>
                    <label>To Date</label>
                    <input type="date" {...register("toDate")} />
                  </div>
                </div>
              )}

              {/* Row 4: Annual Renewal Specific Date */}
              {isAnnualRenewal && (
                <div className={styles.formField}>
                  <label>Renewed Date</label>
                  <input type="date" {...register("updateRenewal")} />
                </div>
              )}

              {/* Row 5: Status & Tax Date (Filing Date only shown when FiledOn) */}
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Status</label>
                  <select {...register("status")}>
                    {getAvailableStatuses(taxRecord.tax_type).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FILING DATE ONLY SHOWN WHEN STATUS IS FiledOn */}
                {currentStatus === "FiledOn" && !isAnnualRenewal && (
                  <div className={styles.formField}>
                    <label>Filing Date *</label>
                    <input
                      type="date"
                      {...register("taxDate", { required: true })}
                    />
                  </div>
                )}
              </div>

              {/* Row 6: Confirmation Number (Conditionally Rendered - NOT for Annual Renewal, NOT required) */}
              {currentStatus === "FiledOn" && !isAnnualRenewal && (
                <div className={styles.formField}>
                  <label>Confirmation Number</label>
                  <input {...register("confirmationNumber")} />
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
