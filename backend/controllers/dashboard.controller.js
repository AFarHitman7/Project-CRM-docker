const { pool } = require("../database/db");

exports.getDashboardCounts = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sql = `
      SELECT
        (SELECT COUNT(*) FROM clients)          AS personal_clients,
        (SELECT COUNT(*) FROM business_clients) AS business_clients
    `;

    const { rows } = await pool.query(sql);

    return res.json({
      personalClients: Number(rows[0].personal_clients),
      businessClients: Number(rows[0].business_clients),
      totalClients:
        Number(rows[0].personal_clients) + Number(rows[0].business_clients),
    });
  } catch (err) {
    console.error("Dashboard count error:", err);
    return res.status(500).json({ error: "server_error" });
  }
};

exports.getStatusCounts = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get current year
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];

    const sql = `
      SELECT
        /* Personal */
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'InProgress' AND tax_year = ANY($1))     AS progress_personal_clients,
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'ReadyForReview' AND tax_year = ANY($1)) AS review_personal_clients,
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'PaperReceived' AND tax_year = ANY($1)) AS paper_received_personal_clients,
        (SELECT COUNT(*) FROM tax_records WHERE tax_status = 'FiledOn' AND tax_year = ANY($1))        AS filed_personal_clients,

        /* Business - HST */
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'InProgress'     AND tax_type = 'HST' AND tax_year = ANY($1)) AS progress_business_hst,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'ReadyForReview' AND tax_type = 'HST' AND tax_year = ANY($1)) AS review_business_hst,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'PaperReceived' AND tax_type = 'HST' AND tax_year = ANY($1)) AS paper_received_business_hst,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'FiledOn'        AND tax_type = 'HST' AND tax_year = ANY($1)) AS filed_business_hst,

        /* Business - Corporation */
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'InProgress'     AND tax_type = 'CORPORATION' AND tax_year = ANY($1)) AS progress_business_corp,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'ReadyForReview' AND tax_type = 'CORPORATION' AND tax_year = ANY($1)) AS review_business_corp,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'PaperReceived' AND tax_type = 'CORPORATION' AND tax_year = ANY($1)) AS paper_received_business_corp,
        (SELECT COUNT(*) FROM business_tax_records WHERE status = 'FiledOn'        AND tax_type = 'CORPORATION' AND tax_year = ANY($1)) AS filed_business_corp
    `;

    const { rows } = await pool.query(sql, [years]);
    const r = rows[0];

    return res.json({
      progressPC: Number(r.progress_personal_clients),
      reviewPC: Number(r.review_personal_clients),
      filedOnPC: Number(r.filed_personal_clients),
      paperReceivedPC: Number(r.paper_received_personal_clients),

      progressBC_HST: Number(r.progress_business_hst),
      reviewBC_HST: Number(r.review_business_hst),
      filedOnBC_HST: Number(r.filed_business_hst),
      paperReceivedBC_HST: Number(r.paper_received_business_hst),

      progressBC_CORP: Number(r.progress_business_corp),
      reviewBC_CORP: Number(r.review_business_corp),
      filedOnBC_CORP: Number(r.filed_business_corp),
      paperReceivedBC_CORP: Number(r.paper_received_business_corp),
    });
  } catch (err) {
    console.error("Status count error:", err);
    return res.status(500).json({ error: "server_error" });
  }
};

exports.listBusinessClientsByStatus = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "500", 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const taxType = (req.query.taxType || "").toUpperCase();
    const status = req.query.status || "";

    if (!taxType || !status) {
      return res.status(400).json({ error: "Missing taxType or status" });
    }

    // Get current year
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];

    const params = [];
    const where = [];

    // 1. Base Params
    params.push(status); // $1
    params.push(taxType); // $2
    params.push(years); // $3

    // 2. Search Param
    if (search) {
      params.push(`%${search}%`); // $4
      where.push(`bc.business_name ILIKE $${params.length}`);
    }

    const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

    // 3. Prepare Data Params
    const dataParams = [...params];
    dataParams.push(limit); // $Next
    dataParams.push(offset); // $Next + 1

    // 4. Data Query
    const dataSql = `
      SELECT DISTINCT
        bc.id,
        bc.business_name,
        bc.contact_name,
        bc.email,
        bc.phone_cell
      FROM business_clients bc
      INNER JOIN business_tax_records tr 
        ON bc.id = tr.business_id 
      WHERE 
        tr.status = $1 
        AND tr.tax_type = $2
        AND tr.tax_year = ANY($3)
        ${whereSql}
      ORDER BY bc.business_name ASC
      LIMIT $${dataParams.length - 1} 
      OFFSET $${dataParams.length}
    `;

    const dataRes = await pool.query(dataSql, dataParams);

    // 5. Count Query
    const countSql = `
      SELECT COUNT(DISTINCT bc.id) 
      FROM business_clients bc
      INNER JOIN business_tax_records tr 
        ON bc.id = tr.business_id 
      WHERE 
        tr.status = $1 
        AND tr.tax_type = $2
        AND tr.tax_year = ANY($3)
        ${whereSql}
    `;

    const countRes = await pool.query(countSql, params);

    res.json({
      clients: dataRes.rows.map((r) => r.business_name),
      data: dataRes.rows,
      meta: {
        total: Number(countRes.rows[0].count),
        page,
        per_page: limit,
      },
    });
  } catch (err) {
    console.error("listClientsByStatus error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.listPersonalClientsByStatus = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "500", 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const status = req.query.status || "";

    if (!status) {
      return res.status(400).json({ error: "Missing status parameter" });
    }

    // Get current year
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];

    const params = [];
    const where = [];

    // 1. Base Params
    params.push(status); // $1
    params.push(years); // $2

    // 2. Search Param (Search First Name or Last Name)
    if (search) {
      params.push(`%${search}%`); // $3
      where.push(
        `(c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length})`,
      );
    }

    const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

    // 3. Prepare Data Query Params
    const dataParams = [...params];
    dataParams.push(limit); // $Next
    dataParams.push(offset); // $Next + 1

    // 4. Data Query
    const dataSql = `
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM clients c
      INNER JOIN tax_records tr 
        ON c.id = tr.client_id 
      WHERE 
        tr.tax_status = $1
        AND tr.tax_year = ANY($2)
        ${whereSql}
      ORDER BY c.first_name ASC, c.last_name ASC
      LIMIT $${dataParams.length - 1} 
      OFFSET $${dataParams.length}
    `;

    const dataRes = await pool.query(dataSql, dataParams);

    // 5. Count Query
    const countSql = `
      SELECT COUNT(DISTINCT c.id) 
      FROM clients c
      INNER JOIN tax_records tr 
        ON c.id = tr.client_id 
      WHERE 
        tr.tax_status = $1
        AND tr.tax_year = ANY($2)
        ${whereSql}
    `;

    const countRes = await pool.query(countSql, params);

    // 6. Response
    const clientList = dataRes.rows.map(
      (r) => `${r.first_name} ${r.last_name}`,
    );

    res.json({
      clients: clientList,
      data: dataRes.rows,
      meta: {
        total: Number(countRes.rows[0].count),
        page,
        per_page: limit,
      },
    });
  } catch (err) {
    console.error("listPersonalClientsByStatus error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getBirthday = async (req, res) => {
  try {
    const sql = `
      SELECT 
        id, 
        first_name, 
        last_name, 
        email,
        phone, 
        dob
      FROM clients
      WHERE dob IS NOT NULL
      ORDER BY 
        CASE 
          WHEN to_char(dob, 'MM-DD') >= to_char(CURRENT_DATE, 'MM-DD') THEN 0 
          ELSE 1 
        END ASC,
        to_char(dob, 'MM-DD') ASC
      LIMIT 10
    `;
    const { rows } = await pool.query(sql);
    if (rows.length === 0) {
      return res.json({ message: "No clients with dates of birth found" });
    }
    return res.json(rows);
  } catch (err) {
    console.error("getBirthday error:", err);
    return res.status(500).json({
      error: "server_error",
      details: err.message,
    });
  }
};

exports.getUpcomingAnnualRenewals = async (req, res) => {
  const conn = await pool.connect();

  try {
    const { rows } = await conn.query(
      `
      WITH renewal_dates AS (
        SELECT
          btp.id,
          btp.business_id,
          bc.business_name,
          btp.start_date,

          -- next occurrence of renewal (ignoring original year)
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
        JOIN business_clients bc
          ON bc.id = btp.business_id
        WHERE btp.tax_type = 'ANNUAL_RENEWAL'
          AND btp.start_date IS NOT NULL
          AND btp.registeredstatus = true
      )

      SELECT *
      FROM renewal_dates
      WHERE next_renewal_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY next_renewal_date ASC
      `,
    );

    return res.status(200).json({
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getUpcomingAnnualRenewals:", err);
    return res.status(500).json({ error: "server_error" });
  } finally {
    conn.release();
  }
};
