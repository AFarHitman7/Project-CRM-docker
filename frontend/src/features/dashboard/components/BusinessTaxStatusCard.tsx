import { useEffect, useState } from "react";
import styles from "./BusinessTaxStatusCard.module.css";
import { FaBriefcase } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";

interface StatusCounts {
  progressBC_HST: number;
  reviewBC_HST: number;
  filedOnBC_HST: number;
  paperReceivedBC_HST: number;
  progressBC_CORP: number;
  reviewBC_CORP: number;
  filedOnBC_CORP: number;
  paperReceivedBC_CORP: number;
}

const BusinessTaxStatusCard = () => {
  const [counts, setCounts] = useState<StatusCounts | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/dashboard/status-counts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

  // Helper to render a single status block
  const renderStatusBlock = (
    label: string,
    count: number,
    type: "paper" | "progress" | "review" | "filed"
  ) => (
    <div className={`${styles.statusBlock} ${styles[type]}`}>
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusValue}>{count}</span>
    </div>
  );

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <FaBriefcase className={styles.headerIcon} />
        <h3 className={styles.title}>BusinessTax Overview</h3>
      </header>

      {/* HST SECTION */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>HST Tax</h4>
        <div className={styles.grid}>
          {renderStatusBlock(
            "PaperReceived",
            counts?.paperReceivedBC_HST ?? 0,
            "paper"
          )}
          {renderStatusBlock(
            "InProgress",
            counts?.progressBC_HST ?? 0,
            "progress"
          )}
          {renderStatusBlock(
            "ReadyForReview",
            counts?.reviewBC_HST ?? 0,
            "review"
          )}
          {renderStatusBlock("Filed", counts?.filedOnBC_HST ?? 0, "filed")}
        </div>
      </div>

      {/* CORPORATION SECTION */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Corporation Tax</h4>
        <div className={styles.grid}>
          {renderStatusBlock(
            "PaperReceived",
            counts?.paperReceivedBC_CORP ?? 0,
            "paper"
          )}
          {renderStatusBlock(
            "InProgress",
            counts?.progressBC_CORP ?? 0,
            "progress"
          )}
          {renderStatusBlock(
            "ReadyForReview",
            counts?.reviewBC_CORP ?? 0,
            "review"
          )}
          {renderStatusBlock("Filed", counts?.filedOnBC_CORP ?? 0, "filed")}
        </div>
      </div>
    </div>
  );
};

export default BusinessTaxStatusCard;
