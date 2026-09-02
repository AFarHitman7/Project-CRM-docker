const cron = require("node-cron");
const { pool } = require("../database/db");

async function syncAnnualRenewals() {
  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Get renewals due today (notifications pushed on the day of the renewal)
    const sql = `
      WITH renewal_dates AS (
        SELECT
          btp.id,
          btp.business_id,
          bc.business_name,
          btp.start_date,
          CASE
            WHEN make_date(
              EXTRACT(YEAR FROM CURRENT_DATE)::int,
              EXTRACT(MONTH FROM btp.start_date)::int,
              EXTRACT(DAY FROM btp.start_date)::int
            ) >= CURRENT_DATE
            THEN make_date(
              EXTRACT(YEAR FROM CURRENT_DATE)::int,
              EXTRACT(MONTH FROM btp.start_date)::int,
              EXTRACT(DAY FROM btp.start_date)::int
            )
            ELSE make_date(
              EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
              EXTRACT(MONTH FROM btp.start_date)::int,
              EXTRACT(DAY FROM btp.start_date)::int
            )
          END AS next_renewal_date
        FROM business_tax_profiles btp
        JOIN business_clients bc ON bc.id = btp.business_id
        WHERE btp.tax_type = 'ANNUAL_RENEWAL'
          AND btp.start_date IS NOT NULL
          AND btp.registeredstatus = true
      )
      SELECT
        *,
        EXTRACT(YEAR FROM next_renewal_date)::int AS due_year
      FROM renewal_dates
      WHERE next_renewal_date = CURRENT_DATE
    `;
    const { rows } = await conn.query(sql);

    // Ensure notifications exist and are in sync with filing status for each due date
    for (const row of rows) {
      const { business_id, business_name, next_renewal_date, due_year } = row;

      const filedResult = await conn.query(
        `
        SELECT 1
        FROM business_tax_records
        WHERE business_id = $1
          AND tax_type = 'ANNUAL_RENEWAL'
          AND (
            tax_year = $2
            OR (tax_date IS NOT NULL AND EXTRACT(YEAR FROM tax_date)::int = $2)
          )
        LIMIT 1
        `,
        [business_id, due_year]
      );
      const status = filedResult.rows.length ? "completed" : "pending";

      // Check if a notification already exists for this exact due date
      const checkSql = `
        SELECT id FROM notifications
        WHERE business_id = $1 AND type = 'ANNUAL_RENEWAL' 
        AND due_date = $2
      `;
      const checkResult = await conn.query(checkSql, [business_id, next_renewal_date]);

      const msg = `Annual Renewal for ${business_name} is due on ${new Date(next_renewal_date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}`;

      if (checkResult.rows.length === 0) {
        const insertSql = `
          INSERT INTO notifications (business_id, type, message, due_date, status, viewed)
          VALUES ($1, 'ANNUAL_RENEWAL', $2, $3, $4, false)
        `;
        await conn.query(insertSql, [business_id, msg, next_renewal_date, status]);
      } else {
        await conn.query(
          `
          UPDATE notifications
          SET status = $1
          WHERE business_id = $2
            AND type = 'ANNUAL_RENEWAL'
            AND due_date = $3
          `,
          [status, business_id, next_renewal_date]
        );
      }
    }

    await conn.query("COMMIT");
    console.log("cron: syncAnnualRenewals completed.");
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("cron: syncAnnualRenewals failed:", err);
  } finally {
    conn.release();
  }
}

async function purgeOldCompletedNotifications() {
  try {
    const { rowCount } = await pool.query(
      `
      DELETE FROM notifications
      WHERE status = 'completed'
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE - INTERVAL '6 months'
      `
    );
    if (rowCount > 0) {
      console.log(`cron: purged ${rowCount} completed notification(s) over 6 months old.`);
    }
  } catch (err) {
    console.error("cron: purgeOldCompletedNotifications failed:", err);
  }
}

function startCronJobs() {
  // Sync daily at midnight
  cron.schedule("0 0 * * *", () => {
    syncAnnualRenewals();
    purgeOldCompletedNotifications();
  });
  console.log("Cron jobs started.");
}

module.exports = { startCronJobs, syncAnnualRenewals, purgeOldCompletedNotifications };
