const cron = require("node-cron");
const { pool } = require("../database/db");

function formatRenewalMessage(businessName, dueDate) {
  return `Annual Renewal for ${businessName} is due on ${new Date(dueDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}`;
}

// One pending notification per (business, filing year). When the renewal date
// is edited, the existing same-year pending is moved to the new due date
// instead of inserting a second row.
async function upsertPendingNotification(conn, businessId, businessName, dueDate) {
  const msg = formatRenewalMessage(businessName, dueDate);
  const existing = await conn.query(
    `SELECT id, due_date, message FROM notifications
     WHERE business_id = $1 AND type = 'ANNUAL_RENEWAL' AND status = 'pending'
       AND due_date IS NOT NULL
       AND EXTRACT(YEAR FROM due_date)::int = EXTRACT(YEAR FROM $2::date)::int
     ORDER BY created_at ASC`,
    [businessId, dueDate]
  );

  if (existing.rows.length === 0) {
    await conn.query(
      `INSERT INTO notifications (business_id, type, message, due_date, status, viewed)
       VALUES ($1, 'ANNUAL_RENEWAL', $2, $3, 'pending', false)`,
      [businessId, msg, dueDate]
    );
    return;
  }

  // Move the earliest same-year pending to the current due date/message,
  // then drop any extra same-year duplicates.
  const keepId = existing.rows[0].id;
  await conn.query(
    `UPDATE notifications SET due_date = $2, message = $3, updated_at = now()
     WHERE id = $1`,
    [keepId, dueDate, msg]
  );
  if (existing.rows.length > 1) {
    await conn.query(
      `DELETE FROM notifications
       WHERE business_id = $1 AND type = 'ANNUAL_RENEWAL' AND status = 'pending'
         AND due_date IS NOT NULL
         AND EXTRACT(YEAR FROM due_date)::int = EXTRACT(YEAR FROM $2::date)::int
         AND id <> $3`,
      [businessId, dueDate, keepId]
    );
  }
}

async function syncAnnualRenewals() {
  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");

    // Drop pending notifications whose profile is gone / unregistered / dateless.
    // Otherwise they linger forever after the renewal is turned off.
    await conn.query(
      `DELETE FROM notifications n
       WHERE n.type = 'ANNUAL_RENEWAL' AND n.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM business_tax_profiles btp
           WHERE btp.business_id = n.business_id
             AND btp.tax_type = 'ANNUAL_RENEWAL'
             AND btp.registeredstatus = true
             AND btp.start_date IS NOT NULL
         )`
    );

    // Notifications fire on the due day only: a pending dated in the future
    // (left over from pushing the renewal date forward) is hidden until then.
    // The due-today upsert below recreates it when the day arrives.
    await conn.query(
      `DELETE FROM notifications
       WHERE type = 'ANNUAL_RENEWAL' AND status = 'pending'
         AND due_date IS NOT NULL
         AND due_date > CURRENT_DATE`
    );

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
      SELECT * FROM renewal_dates
      WHERE next_renewal_date = CURRENT_DATE
    `;
    const { rows } = await conn.query(sql);

    // Upsert (one pending per business per year) so date edits move the
    // existing notification instead of stacking duplicates.
    for (const row of rows) {
      const { business_id, business_name, next_renewal_date } = row;
      await upsertPendingNotification(conn, business_id, business_name, next_renewal_date);
    }

    // Self-heal pre-existing duplicates: collapse multiple same-year pendings
    // into the date derived from the current profile, even when not due today.
    const dupes = await conn.query(
      `SELECT n.business_id,
              EXTRACT(YEAR FROM n.due_date)::int AS yr,
              bc.business_name,
              btp.start_date
       FROM notifications n
       JOIN business_tax_profiles btp
         ON btp.business_id = n.business_id AND btp.tax_type = 'ANNUAL_RENEWAL'
       JOIN business_clients bc ON bc.id = n.business_id
       WHERE n.type = 'ANNUAL_RENEWAL' AND n.status = 'pending'
         AND n.due_date IS NOT NULL
         AND btp.registeredstatus = true
         AND btp.start_date IS NOT NULL
       GROUP BY n.business_id, yr, bc.business_name, btp.start_date
       HAVING COUNT(*) > 1`
    );
    for (const d of dupes.rows) {
      const start = new Date(d.start_date);
      const expected = new Date(start);
      expected.setFullYear(Number(d.yr));
      if (isNaN(expected.getTime())) continue;
      if (expected.getMonth() !== start.getMonth()) continue;
      await upsertPendingNotification(conn, d.business_id, d.business_name, expected);
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

module.exports = { startCronJobs, syncAnnualRenewals, purgeOldCompletedNotifications, upsertPendingNotification, formatRenewalMessage };
