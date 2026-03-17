const { pool } = require("../database/db");
const { syncAnnualRenewals } = require("../cron/syncNotifications");

exports.getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT n.*, bc.business_name 
      FROM notifications n
      JOIN business_clients bc ON n.business_id = bc.id
      ORDER BY n.due_date ASC, n.created_at DESC
    `);
    
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
  try {
    await pool.query(`UPDATE notifications SET viewed = true WHERE viewed = false`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("markViewed:", err);
    return res.status(500).json({ error: "server_error" });
  }
};
