import { useEffect, useState } from "react";
import styles from "./BusinessTaxStatusCard.module.css"; // Shared CSS
import { IoPersonSharp } from "react-icons/io5";

const API_URL = import.meta.env.VITE_API_URL || "";

interface StatusCounts {
  progressPC: number;
  reviewPC: number;
  filedOnPC: number;
  paperReceivedPC: number;
}

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

  // Helper to render the status blocks with the shared styling
  const renderBlock = (
    label: string,
    count: number,
    type: "paper" | "progress" | "review" | "filed",
    statusKey: string
  ) => (
    <div
      className={`${styles.statusBlock} ${styles[type]}`}
      onClick={() => onStatusClick(statusKey)}
      style={{ cursor: "pointer" }} // Inline pointer since shared CSS might lack it for blocks
    >
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusValue}>{count}</span>
    </div>
  );

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        {/* Use headerIcon class to match the scaled-down size of the Business card */}
        <IoPersonSharp className={styles.headerIcon} />
        <h3 className={styles.title}>Personal Tax Overview</h3>
      </header>

      {/* Reuse the 'section' class for the border/padding look */}
      <div className={styles.section}>
        <div className={styles.grid}>
          {renderBlock(
            "InProgress",
            counts?.progressPC ?? 0,
            "progress",
            "InProgress"
          )}

          {renderBlock("Filed", counts?.filedOnPC ?? 0, "filed", "FiledOn")}
        </div>
      </div>
    </div>
  );
};

export default PersonalTaxStatusCard;
