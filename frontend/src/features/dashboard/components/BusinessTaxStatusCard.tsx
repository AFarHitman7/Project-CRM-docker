import { useEffect, useState } from "react";
import styles from "./TaxStatusCard.module.css";

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

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>Business Tax Status</h3>
      </header>

      {/* HST SECTION */}
      <div>
        <div className={styles.sectionTitle}>HST</div>
        <div className={styles.list}>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.InProgress}`}>
              In Progress
            </span>
            <span className={styles.count}>{counts?.progressBC_HST ?? 0}</span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.PaperReceived}`}>
              Paper Received
            </span>
            <span className={styles.count}>
              {counts?.paperReceivedBC_HST ?? 0}
            </span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.ReadyForReview}`}>
              Ready For Review
            </span>
            <span className={styles.count}>{counts?.reviewBC_HST ?? 0}</span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.FiledOn}`}>
              Filed On
            </span>
            <span className={styles.count}>{counts?.filedOnBC_HST ?? 0}</span>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* CORPORATION SECTION */}
      <div>
        <div className={styles.sectionTitle}>Corporation</div>
        <div className={styles.list}>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.InProgress}`}>
              In Progress
            </span>
            <span className={styles.count}>{counts?.progressBC_CORP ?? 0}</span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.PaperReceived}`}>
              Paper Received
            </span>
            <span className={styles.count}>
              {counts?.paperReceivedBC_CORP ?? 0}
            </span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.ReadyForReview}`}>
              Ready For Review
            </span>
            <span className={styles.count}>{counts?.reviewBC_CORP ?? 0}</span>
          </div>
          <div className={styles.row}>
            <span className={`${styles.statusBadge} ${styles.FiledOn}`}>
              Filed On
            </span>
            <span className={styles.count}>{counts?.filedOnBC_CORP ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessTaxStatusCard;
