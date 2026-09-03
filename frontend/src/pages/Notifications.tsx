import { useEffect, useMemo, useState } from "react";
import styles from "./Notifications.module.css";
import { IoCheckmarkDoneOutline, IoTimeOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

interface NotificationItem {
  id: string;
  business_id?: string;
  business_name?: string;
  message?: string;
  due_date?: string;
  viewed?: boolean;
  status?: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setNotifications([]);
      return;
    }

    fetch(`${API_URL}/api/notifications`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => setNotifications(data.data || []))
      .catch(() => setNotifications([]));
  }, []);

  const pendingCount = useMemo(
    () => notifications.filter((item) => item.status === "pending").length,
    [notifications],
  );

  const completedCount = useMemo(
    () => notifications.filter((item) => item.status === "completed").length,
    [notifications],
  );

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => item.status === activeTab),
    [notifications, activeTab],
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Notifications</h2>
          <p>{notifications.length} total reminders</p>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pending"}
            className={`${styles.tab} ${activeTab === "pending" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            <IoTimeOutline size="1rem" />
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "completed"}
            className={`${styles.tab} ${activeTab === "completed" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            <IoCheckmarkDoneOutline size="1rem" />
            Completed ({completedCount})
          </button>
        </div>

        <div className={styles.notificationList}>
          {visibleNotifications.length === 0 && (
            <p className={styles.empty}>
              {activeTab === "pending"
                ? "No pending notifications."
                : "No completed notifications."}
            </p>
          )}

          {visibleNotifications.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.notificationCard}
              onClick={() => {
                if (item.business_id) {
                  navigate(`/business/${item.business_id}`);
                }
              }}
              disabled={!item.business_id}
              title={!item.business_id ? "No linked business" : undefined}
            >
              <div className={styles.cardTop}>
                <p className={styles.business}>{item.business_name || "Business"}</p>
                <span className={item.status === "completed" ? styles.readBadge : styles.unreadBadge}>
                  {item.status === "completed" ? "Completed" : "Pending"}
                </span>
              </div>
              <p className={styles.message}>
                {item.message ||
                  `Renewal due on ${item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}`}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
