import { useEffect, useState } from "react";
import styles from "./totalClientsCard.module.css";
import { MdGroups } from "react-icons/md";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Counts {
  personalClients: number;
  businessClients: number;
  totalClients: number;
}

const TotalClientsCard = () => {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/dashboard/counts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

  const personal = counts?.personalClients ?? 0;
  const business = counts?.businessClients ?? 0;
  const total = counts?.totalClients ?? 0;

  /* donut math */
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentage of PERSONAL clients
  const progress = total > 0 ? (personal / total) * 100 : 0;
  const offset = circumference - (progress / 100) * circumference;

  // Colors from your CSS
  const COLOR_PERSONAL = "#214de7"; // dotDark (Blue)
  const COLOR_BUSINESS = "#f43535"; // dotLight (Red)
  const COLOR_EMPTY = "#E5E7EB"; // Gray for when total is 0

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <MdGroups size={"1.5rem"} />
          <h3 className={styles.title}>Total Clients</h3>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.donutWrap} aria-hidden>
          <svg
            className={styles.donut}
            width="140"
            height="140"
            viewBox="0 0 140 140"
          >
            <g transform="translate(70,70)">
              {/* 1. BACKGROUND CIRCLE (Red / Business) 
                 This sits at the bottom. Since Personal + Business = Total,
                 whatever isn't covered by the Blue (Personal) circle will show as Red (Business).
                 If total is 0, we show gray.
              */}
              <circle
                r={radius}
                stroke={total > 0 ? COLOR_BUSINESS : COLOR_EMPTY}
                strokeWidth="4"
                fill="none"
              />

              {/* 2. FOREGROUND CIRCLE (Blue / Personal) 
                 This overlays the red circle based on the percentage of personal clients.
              */}
              {total > 0 && (
                <circle
                  r={radius}
                  stroke={COLOR_PERSONAL}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90)"
                />
              )}
            </g>
          </svg>

          <div className={styles.donutLabel}>
            <div className={styles.totalNumber}>{total}</div>
            <div className={styles.totalText}>Total</div>
          </div>
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.dotDark} />
            <div className={styles.legendText}>
              <div className={styles.legendTitle}>Personal Clients</div>
              <div className={styles.legendValue}>{personal}</div>
            </div>
          </div>

          <div className={styles.legendItem}>
            <span className={styles.dotLight} />
            <div className={styles.legendText}>
              <div className={styles.legendTitle}>Business Clients</div>
              <div className={styles.legendValue}>{business}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalClientsCard;
