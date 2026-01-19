import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom"; // Import hook for navigation
import styles from "./StatusListModal.module.css";
import { FaPhone, FaEnvelope, FaChevronRight } from "react-icons/fa"; // Icons for better UI

const API_URL = import.meta.env.VITE_API_URL || "";

interface Client {
  id: string;
  // Business specific fields
  business_name?: string;
  contact_name?: string;
  phone_cell?: string;
  // Personal specific fields
  first_name?: string;
  last_name?: string;
  phone?: string;
  // Common
  email?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  config: {
    category: "BUSINESS" | "PERSONAL";
    status: string;
    taxType?: string;
  } | null;
}

export default function StatusListModal({
  visible,
  onClose,
  title,
  config,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (visible && config) {
      fetchClients();
    } else {
      setClients([]);
      setError("");
    }
  }, [visible, config]);

  const fetchClients = async () => {
    if (!config) return;

    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Unauthorized: No token found");
      setLoading(false);
      return;
    }

    try {
      let url = "";
      const queryParams: Record<string, string> = { status: config.status };

      if (config.category === "BUSINESS") {
        queryParams.taxType = config.taxType || "";
        const qs = new URLSearchParams(queryParams).toString();
        url = `${API_URL}/api/dashboard/bclient?${qs}`;
      } else {
        const qs = new URLSearchParams(queryParams).toString();
        url = `${API_URL}/api/dashboard/pclient?${qs}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch client list");

      const data = await res.json();

      // IMPORTANT: Use 'data.data' which contains the full objects (id, email, phone)
      // instead of 'data.clients' which only had names.
      setClients(data.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (client: Client) => {
    onClose(); // Close modal first

    if (config?.category === "BUSINESS") {
      // Navigate to Business Details
      // Adjust path prefix if your routes are not under /dashboard
      navigate(`/business/${client.id}`);
    } else {
      // Navigate to Personal Details
      navigate(`/personal/${client.id}`);
    }
  };

  // Helper to get display name safely
  const getClientName = (c: Client) => {
    if (config?.category === "BUSINESS")
      return c.business_name || "Unknown Business";
    return (
      `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown Client"
    );
  };

  // Helper to get phone safely
  const getClientPhone = (c: Client) => {
    return c.phone_cell || c.phone || "No Phone";
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (visible) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [visible, onClose]);

  if (!visible) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.header}>
          <h3>{title}</h3>
          <button
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close modal"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {loading && <div className={styles.loading}>Loading clients...</div>}

          {error && <div className={styles.error}>{error}</div>}

          {!loading && !error && clients.length === 0 && (
            <div className={styles.empty}>
              No clients found with this status.
            </div>
          )}

          {!loading && !error && clients.length > 0 && (
            <ul className={styles.list}>
              {clients.map((client) => (
                <li
                  key={client.id}
                  className={styles.listItem}
                  onClick={() => handleClientClick(client)}
                >
                  <div className={styles.itemContent}>
                    <div className={styles.nameRow}>
                      <span className={styles.clientName}>
                        {getClientName(client)}
                      </span>
                    </div>

                    <div className={styles.detailsRow}>
                      {client.email && (
                        <span className={styles.detailBadge}>
                          <FaEnvelope size={10} /> {client.email}
                        </span>
                      )}
                      {(client.phone || client.phone_cell) && (
                        <span className={styles.detailBadge}>
                          <FaPhone size={10} /> {getClientPhone(client)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.itemAction}>
                    <FaChevronRight className={styles.arrowIcon} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
