import { useEffect, useState } from "react";
import styles from "./BusinessTaxStatusCard.module.css"; // Shared CSS
import { IoPersonSharp } from "react-icons/io5";
import StatusListModal from "./StatusListModal"; // 1. Import the modal

const API_URL = import.meta.env.VITE_API_URL || "";

interface StatusCounts {
  progressPC: number;
  reviewPC: number;
  filedOnPC: number;
  paperReceivedPC: number;
}

// Removed Props interface since we handle the click internally now
const PersonalTaxStatusCard = () => {
  const [counts, setCounts] = useState<StatusCounts | null>(null);

  // 2. Add State for the Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalConfig, setModalConfig] = useState<{
    category: "BUSINESS" | "PERSONAL";
    status: string;
    taxType?: string;
  } | null>(null);

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

  // 3. Handler when a block is clicked
  const handleBlockClick = (label: string, apiStatusKey: string) => {
    setModalTitle(`Personal Tax - ${label}`);
    setModalConfig({
      category: "PERSONAL",
      status: apiStatusKey, // "InProgress" or "FiledOn"
      // taxType is not needed for Personal clients in your current setup
    });
    setShowModal(true);
  };

  // 4. Update helper to use the internal handler
  const renderBlock = (
    label: string,
    count: number,
    type: "paper" | "progress" | "review" | "filed",
    apiStatusKey: string
  ) => (
    <div
      className={`${styles.statusBlock} ${styles[type]}`}
      onClick={() => handleBlockClick(label, apiStatusKey)}
      style={{ cursor: "pointer" }}
    >
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusValue}>{count}</span>
    </div>
  );

  return (
    <>
      <div className={styles.card}>
        <header className={styles.header}>
          <IoPersonSharp className={styles.headerIcon} />
          <h3 className={styles.title}>Personal Tax Overview</h3>
        </header>

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

      {/* 5. Render the Modal */}
      <StatusListModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        config={modalConfig}
      />
    </>
  );
};

export default PersonalTaxStatusCard;
