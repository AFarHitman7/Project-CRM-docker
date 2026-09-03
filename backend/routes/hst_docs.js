// src/routes/hstDocs.js
const express = require("express");
const upload = require("../middleware/upload");
const crypto = require("crypto");
const fs = require("fs");
const { pool } = require("../database/db");
const path = require("path");
const { hstDocsUploadDir } = require("../config/storage");

const router = express.Router();

// object_store_key values reach the filesystem, so they must never be able
// to escape the upload directory. Stored keys are multer-generated
// (`uuid.ext`); anything with separators, "..", absolute paths, or that
// resolves outside the upload dir is rejected.
function resolveStorePath(key) {
  if (typeof key !== "string" || !key) return null;
  if (key.includes("..") || key.includes("/") || key.includes("\\")) return null;
  if (path.isAbsolute(key)) return null;
  if (path.basename(key) !== key) return null;
  const resolved = path.resolve(hstDocsUploadDir, key);
  const base = path.resolve(hstDocsUploadDir) + path.sep;
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

async function discardUploadedFile(req) {
  if (req.file?.path) {
    await fs.promises.unlink(req.file.path).catch(() => {});
  }
}

router.post("/:taxRecordId", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });

  const { taxRecordId } = req.params;
  const { clientId, businessId, notes } = req.body;
  const checksum = crypto
    .createHash("sha256")
    .update(fs.readFileSync(req.file.path))
    .digest("hex");

  if (!clientId && !businessId) {
    await discardUploadedFile(req);
    return res.status(400).json({ error: "owner_required" });
  }

  if (clientId && businessId) {
    await discardUploadedFile(req);
    return res.status(400).json({ error: "ambiguous_owner" });
  }

  await pool.query(
    `
  INSERT INTO hst_docs (
    client_id,
    business_id,
    tax_record_id,
    filename,
    object_store_key,
    uploaded_by,
    checksum,
    notes
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `,
    [
      clientId || null,
      businessId || null,
      taxRecordId,
      req.file.originalname,
      req.file.filename,
      req.user.id,
      checksum,
      notes || null,
    ]
  );

  res.json({ ok: true });
});

async function deleteHstDoc(req, res) {
  const docId = req.params.docId?.trim();

  if (!docId) return res.status(400).json({ error: "invalid_doc_id" });

  if (!req.user || !["admin", "auditor"].includes(req.user.role)) {
    return res.sendStatus(403);
  }

  const { rows } = await pool.query(
    `
    DELETE FROM hst_docs
    WHERE id = $1
    RETURNING id, object_store_key
    `,
    [docId]
  );

  if (!rows.length) return res.sendStatus(404);

  const filePath = resolveStorePath(rows[0].object_store_key);
  if (!filePath) return res.sendStatus(404);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to delete uploaded file:", error);
      return res.status(500).json({ error: "file_delete_failed" });
    }
  }

  return res.json({ ok: true });
}

router.delete("/:docId", deleteHstDoc);
router.delete("/file/:docId", deleteHstDoc);

router.get("/file/:docId", async (req, res) => {
  const docId = req.params.docId.trim();

  const { rows } = await pool.query(
    `
    SELECT object_store_key, client_id, business_id
    FROM hst_docs
    WHERE id = $1
    `,
    [docId]
  );

  if (!rows.length) return res.sendStatus(404);

  // ownership check
  if (!["admin", "auditor"].includes(req.user.role)) {
    return res.sendStatus(403);
  }
  const filePath = resolveStorePath(rows[0].object_store_key);
  if (!filePath) return res.sendStatus(404);

  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.sendStatus(err.code === "ENOENT" ? 404 : 500);
    }
  });
});

module.exports = router;
module.exports.resolveStorePath = resolveStorePath;
