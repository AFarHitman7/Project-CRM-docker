import styles from "./Dashboard.module.css";
import BusinessTaxStatusCard from "./components/BusinessTaxStatusCard";
import PersonalTaxStatusCard from "./components/PersonalTaxStatusCard";
import TotalClientsCard from "./components/TotalClientsCard";
import BirthdayCard from "./components/BirthdayCard";

export default function Dashboard() {
  return (
    <>
      <div className={styles.dashboard}>
        <section className={styles.dashSection}>
          <div className={styles.dashCard}>
            <TotalClientsCard />
          </div>
          <div className={styles.dashCard}>
            <PersonalTaxStatusCard />
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
