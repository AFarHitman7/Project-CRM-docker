import React, { useEffect, useState } from "react";
import styles from "./BirthdayCard.module.css";
import { IoPaperPlane, IoChevronBack, IoChevronForward } from "react-icons/io5";
import { BsCalendar2DateFill } from "react-icons/bs";
const API_URL = import.meta.env.VITE_API_URL || "";

interface BirthdayData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  dob: string;
}

// Switched to Sunday start to match your 'Ann Thomas' image reference
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BirthdayCard: React.FC = () => {
  const [birthday, setBirthday] = useState<BirthdayData | null>(null);

  // Tracks the current point in time we are viewing (defaults to today)
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const fetchBirthday = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/dashboard/birthday`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data && data.id) {
          setBirthday(data);
          // If a birthday exists, jump the view to that week
          if (data.dob) {
            setViewDate(new Date(data.dob));
          }
        }
      } catch (err) {
        console.error("Failed to fetch birthday", err);
      }
    };

    fetchBirthday();
  }, []);

  /* --- WEEKLY CALENDAR LOGIC --- */

  // 1. Calculate the start of the week (Sunday) for the current viewDate
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = d.getDate() - day; // subtract to get back to Sunday
    return new Date(d.setDate(diff));
  };

  // 2. Navigation Handler (+/- 1 Week)
  const changeWeek = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + offset * 7);
    setViewDate(newDate);
  };

  // 3. Generate the 7 days array
  const startOfWeek = getStartOfWeek(viewDate);
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i); // Increment day by i

    // Check if this specific day is the birthday (Month + Day match)
    let isBirthday = false;
    if (birthday?.dob) {
      const bDate = new Date(birthday.dob);
      // Compare Day and Month (ignore year for recurring birthdays, or match year if specific)
      // Usually for calendars we match Day/Month.
      // Since the API returns a specific date (e.g. 2026), we'll match Month & Date.
      isBirthday =
        d.getDate() === bDate.getDate() && d.getMonth() === bDate.getMonth();
    }

    weekDays.push({
      date: d,
      dayNum: d.getDate(),
      isBirthday,
      isWeekend: i === 0 || i === 6, // Sunday (0) or Saturday (6)
    });
  }

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <BsCalendar2DateFill size={"1.2rem"} />
        <h3 className={styles.title}>Calendar</h3>
      </header>

      <div className={styles.body}>
        {/* Custom Weekly Widget */}
        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <button onClick={() => changeWeek(-1)} className={styles.navBtn}>
              <IoChevronBack />
            </button>
            <span className={styles.monthLabel}>
              {/* Show Month and Year of the week's start */}
              {startOfWeek.toLocaleString("default", { month: "long" })}{" "}
            </span>
            <button onClick={() => changeWeek(1)} className={styles.navBtn}>
              <IoChevronForward />
            </button>
          </div>

          <div className={styles.weekGrid}>
            {/* Render Day Names (Sun, Mon...) */}
            {WEEKDAYS.map((day) => (
              <span key={day} className={styles.weekday}>
                {day}
              </span>
            ))}

            {/* Render Day Numbers (9, 10...) */}
            {weekDays.map((item) => (
              <div
                key={item.date.toISOString()}
                className={`${styles.day} ${
                  item.isWeekend ? styles.weekend : ""
                } ${item.isBirthday ? styles.selected : ""}`}
              >
                {item.dayNum}
              </div>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        {birthday ? (
          <div className={styles.profileSection}>
            <div className={styles.divider} />
            <div className={styles.profileRow}>
              <div className={styles.avatar}>
                {birthday.first_name[0]}
                {birthday.last_name[0]}
              </div>
              <div className={styles.profileInfo}>
                <h4 className={styles.profileName}>
                  {birthday.first_name} {birthday.last_name}
                </h4>
                <p className={styles.profileText}>
                  {birthday.first_name}’s Birthday is on{" "}
                  {new Date(birthday.dob).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}
                  .
                </p>
              </div>
            </div>

            <a
              href={`mailto:${birthday.email}?subject=Happy Birthday!`}
              className={styles.wishButton}
            >
              Say Happy Birthday <IoPaperPlane />
            </a>
          </div>
        ) : (
          <div className={styles.emptyState}>No upcoming birthdays.</div>
        )}
      </div>
    </div>
  );
};

export default BirthdayCard;
