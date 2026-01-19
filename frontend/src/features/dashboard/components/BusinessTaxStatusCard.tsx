import { useEffect, useState } from "react";
import styles from "./BusinessTaxStatusCard.module.css";
import { FaBriefcase } from "react-icons/fa";
import StatusListModal from "./StatusListModal"; // 1. Import the modal

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
  const handleBlockClick = (
    label: string,
    taxType: string,
    apiStatusKey: string
  ) => {
    setModalTitle(`${taxType} Tax - ${label}`);
    setModalConfig({
      category: "BUSINESS",
      status: apiStatusKey, // "InProgress", "FiledOn", etc.
      taxType: taxType, // "HST" or "CORPORATION"
    });
    setShowModal(true);
  };

  // 4. Update helper to accept taxType and apiStatusKey
  const renderStatusBlock = (
    label: string,
    count: number,
    type: "paper" | "progress" | "review" | "filed",
    taxType: "HST" | "CORPORATION",
    apiStatusKey: string
  ) => (
    <div
      className={`${styles.statusBlock} ${styles[type]}`}
      onClick={() => handleBlockClick(label, taxType, apiStatusKey)}
      style={{ cursor: "pointer" }} // Add pointer cursor to indicate clickability
    >
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusValue}>{count}</span>
    </div>
  );

  return (
    <>
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
              "paper",
              "HST",
              "PaperReceived"
            )}
            {renderStatusBlock(
              "InProgress",
              counts?.progressBC_HST ?? 0,
              "progress",
              "HST",
              "InProgress"
            )}
            {renderStatusBlock(
              "ReadyForReview",
              counts?.reviewBC_HST ?? 0,
              "review",
              "HST",
              "ReadyForReview"
            )}
            {renderStatusBlock(
              "Filed",
              counts?.filedOnBC_HST ?? 0,
              "filed",
              "HST",
              "FiledOn"
            )}
          </div>
        </div>

        {/* CORPORATION SECTION */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Corporation Tax</h4>
          <div className={styles.grid}>
            {renderStatusBlock(
              "PaperReceived",
              counts?.paperReceivedBC_CORP ?? 0,
              "paper",
              "CORPORATION",
              "PaperReceived"
            )}
            {renderStatusBlock(
              "InProgress",
              counts?.progressBC_CORP ?? 0,
              "progress",
              "CORPORATION",
              "InProgress"
            )}
            {renderStatusBlock(
              "ReadyForReview",
              counts?.reviewBC_CORP ?? 0,
              "review",
              "CORPORATION",
              "ReadyForReview"
            )}
            {renderStatusBlock(
              "Filed",
              counts?.filedOnBC_CORP ?? 0,
              "filed",
              "CORPORATION",
              "FiledOn"
            )}
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

export default BusinessTaxStatusCard;
