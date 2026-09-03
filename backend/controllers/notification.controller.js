const { pool } = require("../database/db");
const { syncAnnualRenewals } = require("../cron/syncNotifications");

exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await pool.query(
      `
      SELECT
        n.*,
        bc.business_name,
        CASE WHEN nv.user_id IS NOT NULL THEN true ELSE false END AS viewed
      FROM notifications n
      JOIN business_clients bc ON n.business_id = bc.id
      LEFT JOIN notification_views nv
        ON nv.notification_id = n.id AND nv.user_id = $1
      ORDER BY
        CASE WHEN n.status = 'pending' THEN 0 ELSE 1 END,
        n.due_date DESC NULLS LAST, n.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({ count: rows.length, data: rows });
  } catch (err) {
    console.error("getNotifications:", err);
    return res.status(500).json({ error: "server_error" });
  }
};

exports.syncNotifications = async (req, res) => {
  try {
    await syncAnnualRenewals();
    return res.status(200).json({ success: true, message: "Sync complete" });
  } catch (err) {
    return res.status(500).json({ error: "server_error" });
  }
};

exports.markViewed = async (req, res) => {
  const userId = req.user.id;
  try {
    // Insert a view record for every pending notification not yet viewed by this user.
    // ON CONFLICT DO NOTHING handles duplicates safely.
    await pool.query(
      `
      INSERT INTO notification_views (notification_id, user_id)
      SELECT n.id, $1
      FROM notifications n
      WHERE n.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM notification_views nv
          WHERE nv.notification_id = n.id AND nv.user_id = $1
        )
      ON CONFLICT (notification_id, user_id) DO NOTHING
      `,
      [userId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("markViewed:", err);
    return res.status(500).json({ error: "server_error" });
  }
};
