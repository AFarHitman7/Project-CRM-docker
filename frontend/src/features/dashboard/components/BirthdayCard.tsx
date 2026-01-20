import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BirthdayCard.module.css";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { BsCalendar2DateFill } from "react-icons/bs";
import { FaPhoneAlt, FaEnvelope } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";

interface BirthdayData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  dob: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BirthdayCard: React.FC = () => {
  const navigate = useNavigate();

  const [birthdayGroups, setBirthdayGroups] = useState<BirthdayData[][]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);

  // Initialize viewDate to today so the calendar starts on the current week
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [allBirthdays, setAllBirthdays] = useState<BirthdayData[]>([]);

  // Helper: Calculate the next occurrence of a birthday
  const getNextBirthdayDate = (dobString: string): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dob = new Date(dobString);
    const nextBday = new Date(
      today.getFullYear(),
      dob.getMonth(),
      dob.getDate()
    );

    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }
    return nextBday;
  };

  const isSameDayMonth = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth();

  useEffect(() => {
    const fetchBirthdays = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/dashboard/birthday`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: BirthdayData[] = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          // 1. Sort all by next upcoming date
          const sorted = data.sort((a, b) => {
            const dateA = getNextBirthdayDate(a.dob);
            const dateB = getNextBirthdayDate(b.dob);
            return dateA.getTime() - dateB.getTime();
          });

          setAllBirthdays(sorted);

          // 2. Group by Date (MM-DD)
          const groups: BirthdayData[][] = [];
          sorted.forEach((person) => {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.length > 0) {
              const lastPersonDate = getNextBirthdayDate(lastGroup[0].dob);
              const currentPersonDate = getNextBirthdayDate(person.dob);

              // Check if same day and month
              if (
                lastPersonDate.getDate() === currentPersonDate.getDate() &&
                lastPersonDate.getMonth() === currentPersonDate.getMonth()
              ) {
                lastGroup.push(person);
                return;
              }
            }
            groups.push([person]);
          });

          setBirthdayGroups(groups);
          setCurrentGroupIndex(0);

          // REMOVED: The logic that auto-updated setViewDate here.
          // The calendar will now remain on the current week.
        }
      } catch (err) {
        console.error("Failed to fetch birthdays", err);
      }
    };

    fetchBirthdays();
  }, []);

  const currentGroup = birthdayGroups[currentGroupIndex] || [];
  const primaryPerson = currentGroup[0]; // Used for date display

  /* ---------------- WEEK LOGIC ---------------- */

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const changeWeek = (offset: number) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + offset * 7);
    setViewDate(d);
  };

  const startOfWeek = getStartOfWeek(viewDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const isToday = d.getTime() === today.getTime();

      // Check if this day matches ANYONE in the full list
      const hasAnyBirthday = allBirthdays.some((p) => {
        const b = new Date(p.dob);
        return d.getDate() === b.getDate() && d.getMonth() === b.getMonth();
      });

      // Highlight if this day matches the CURRENTLY displayed group (in the list below)
      let isCurrentGroupDate = false;
      if (primaryPerson) {
        const b = new Date(primaryPerson.dob);
        isCurrentGroupDate =
          d.getDate() === b.getDate() && d.getMonth() === b.getMonth();
      }

      return {
        date: d,
        dayNum: d.getDate(),
        isWeekend: i === 0 || i === 6,
        hasAnyBirthday,
        isCurrentGroupDate,
        isToday,
      };
    });
  }, [startOfWeek, allBirthdays, primaryPerson]);

  /* ---------------- RENDER ---------------- */

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <BsCalendar2DateFill size="1rem" />
        <h3 className={styles.title}>Upcoming Birthdays</h3>
      </header>

      <div className={styles.body}>
        {/* Calendar Section */}
        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <button onClick={() => changeWeek(-1)} className={styles.navBtn}>
              <IoChevronBack />
            </button>

            <span className={styles.monthLabel}>
              {startOfWeek.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>

            <button onClick={() => changeWeek(1)} className={styles.navBtn}>
              <IoChevronForward />
            </button>
          </div>

          <div className={styles.weekGrid}>
            {WEEKDAYS.map((day) => (
              <span key={day} className={styles.weekday}>
                {day}
              </span>
            ))}

            {weekDays.map((item) => (
              <div
                key={item.date.toISOString()}
                className={[
                  styles.day,
                  item.isWeekend && styles.weekend,
                  item.isToday && styles.today,
                  selectedDate &&
                    isSameDayMonth(item.date, selectedDate) &&
                    styles.selectedDateBox,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (!item.hasAnyBirthday) return;

                  setSelectedDate(item.date);

                  // Find which group corresponds to the clicked date
                  const groupIndex = birthdayGroups.findIndex((group) =>
                    isSameDayMonth(new Date(group[0].dob), item.date)
                  );

                  if (groupIndex !== -1) {
                    setCurrentGroupIndex(groupIndex);
                    // Only jump view if user explicitly clicks a date
                    // setViewDate(getNextBirthdayDate(birthdayGroups[groupIndex][0].dob));
                  }
                }}
              >
                {item.dayNum}
                {item.hasAnyBirthday && <span className={styles.birthdayDot} />}
              </div>
            ))}
          </div>
        </div>

        {/* Profile / List Section */}
        {currentGroup.length > 0 ? (
          <div className={styles.profileSection}>
            <div className={styles.divider} />

            {/* Navigation Header */}
            <div className={styles.groupHeader}>
              <div className={styles.dateTitle}>
                {new Date(primaryPerson.dob).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
                <span className={styles.birthdayCount}>
                  ({currentGroup.length} Birthday
                  {currentGroup.length > 1 ? "s" : ""})
                </span>
              </div>
            </div>

            {/* List of Users (Column) */}
            <div className={styles.usersList}>
              {currentGroup.map((user) => (
                <div
                  key={user.id}
                  className={styles.userRow}
                  onClick={() => navigate(`/personal/${user.id}`)}
                >
                  <div className={styles.avatar}>
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </div>

                  <div className={styles.userInfo}>
                    <h4 className={styles.userName}>
                      {user.first_name} {user.last_name}
                    </h4>

                    <div className={styles.contactDetails}>
                      <span className={styles.contactItem} title={user.email}>
                        <FaEnvelope size={10} /> {user.email}
                      </span>
                      {user.phone && (
                        <span className={styles.contactItem} title={user.phone}>
                          <FaPhoneAlt size={10} /> {user.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>No upcoming birthdays.</div>
        )}
      </div>
    </div>
  );
};

export default BirthdayCard;
