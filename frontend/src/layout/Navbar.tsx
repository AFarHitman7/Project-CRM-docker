import { useEffect, useState, useRef } from "react";
import styles from "./Navbar.module.css";
import { useNavigate } from "react-router-dom";
import { IoMdContact } from "react-icons/io";
import { IoNotificationsOutline } from "react-icons/io5";

const API_URL = import.meta.env.VITE_API_URL || "";

const Navbar = () => {
  const [user]: any = useState(() => {
    const userLocal = localStorage.getItem("user");
    const userSession = sessionStorage.getItem("user");
    return (
      (userLocal ? JSON.parse(userLocal) : null) ||
      (userSession ? JSON.parse(userSession) : null)
    );
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pendingCount = notifications.filter((n: any) => n.status === "pending").length;
  const pendingNotifications = notifications.filter((n: any) => n.status === "pending");

  const toggleDropdown = () => {
    setOpen((prev) => !prev);
  };

  const handleRedirect = (businessId: string) => {
    setOpen(false);
    navigate(`/business/${businessId}`);
  };

  const handleViewAllNotifications = () => {
    setOpen(false);
    navigate("/notifications");
  };

  return (
    <div className={styles.navbar}>
      <h3>Welcome Back{user?.username ? `, ${user.username}` : ""}</h3>

      <div className={styles.actions}>
        <div
          className={styles.notif}
          onClick={toggleDropdown}
          ref={dropdownRef}
        >
          <IoNotificationsOutline size="1.6rem" />

          {pendingCount > 0 && (
            <span className={styles.badge}>{pendingCount}</span>
          )}

          {open && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownTitle}>Notifications</p>
                <p className={styles.dropdownCount}>{pendingNotifications.length}</p>
              </div>

              <div className={styles.dropdownList}>
                {pendingNotifications.length === 0 && (
                  <p className={styles.empty}>No upcoming renewals</p>
                )}

                {pendingNotifications.map((item: any) => (
                  <div
                    key={item.id}
                    className={styles.notificationItem}
                    onClick={() => handleRedirect(item.business_id)}
                  >
                    <p className={styles.title}>{item.business_name}</p>
                    <p className={styles.sub}>
                      {item.message || `Renewal due on ${item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}`}
                    </p>
                  </div>
                ))}
              </div>

              <div className={styles.dropdownFooter}>
                <button
                  type="button"
                  className={styles.viewAllButton}
                  onClick={handleViewAllNotifications}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.profile} onClick={() => navigate("/profile")}>
          <div className={styles.img}>
            <IoMdContact size="1.6rem" />
          </div>

          <div className={styles.credentials}>
            <p className={styles.user}>{user?.username || "User"}</p>
            <p className={styles.usertype}>{user?.role || "Role"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
