import { useEffect, useState } from "react";
import styles from "./TaxStatusCard.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

interface StatusCounts {
  progressPC: number;
  reviewPC: number;
  filedOnPC: number;
  paperReceivedPC: number;
}

// 1. Add interface for props
interface Props {
  onStatusClick: (status: string) => void;
}

const PersonalTaxStatusCard = ({ onStatusClick }: Props) => {
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
        <h3 className={styles.title}>Personal Tax Status</h3>
      </header>

      <div className={`${styles.list} ${styles.personalList}`}>
        <div className={styles.row}>
          <span
            className={`${styles.statusBadge} ${styles.personalStatusBadge} ${styles.InProgress}`}
            onClick={() => onStatusClick("InProgress")}
          >
            In Progress
          </span>
          <span className={styles.count}>{counts?.progressPC ?? 0}</span>
        </div>

        <div className={styles.row}>
          <span
            className={`${styles.statusBadge} ${styles.personalStatusBadge} ${styles.FiledOn}`}
            onClick={() => onStatusClick("FiledOn")}
          >
            Filed On
          </span>
          <span className={styles.count}>{counts?.filedOnPC ?? 0}</span>
        </div>
      </div>
    </div>
  );
};

export default PersonalTaxStatusCard;
