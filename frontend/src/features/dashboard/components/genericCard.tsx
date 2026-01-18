import React from "react";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // Default styling
import styles from "./GenericCard.module.css";
import "./CalendarOverrides.css";

type Props = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
};

const GenericCard: React.FC<Props> = () => {
  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Calender</h3>
        </div>
      </header>

      <div className={styles.body}>
        <Calendar />
      </div>
    </div>
  );
};

export default GenericCard;
