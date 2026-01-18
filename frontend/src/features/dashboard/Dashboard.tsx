import styles from "./Dashboard.module.css";
import BusinessTaxStatusCard from "./components/BusinessTaxStatusCard";
import PersonalTaxStatusCard from "./components/PersonalTaxStatusCard";
import TotalClientsCard from "./components/TotalClientsCard";
import BirthdayCard from "./components/BirthdayCard";

interface DashboardProps {
  onStatusClick: (status: string) => void;
}

export default function Dashboard({ onStatusClick }: DashboardProps) {
  return (
    <>
      <div className={styles.dashboard}>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <TotalClientsCard />
          </div>
          <div className={styles.dashCard}>
            <PersonalTaxStatusCard onStatusClick={onStatusClick} />
          </div>
        </section>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <BusinessTaxStatusCard />
          </div>
        </section>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <BirthdayCard />
          </div>
        </section>
      </div>
    </>
  );
}
