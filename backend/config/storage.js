const fs = require("fs");
const path = require("path");

const defaultHstDocsDir = path.resolve(__dirname, "../uploads/hst_docs");
const configuredHstDocsDir = process.env.HST_DOCS_UPLOAD_DIR;

const hstDocsUploadDir = configuredHstDocsDir
  ? path.resolve(configuredHstDocsDir)
  : defaultHstDocsDir;

fs.mkdirSync(hstDocsUploadDir, { recursive: true });

module.exports = {
  hstDocsUploadDir,
};
