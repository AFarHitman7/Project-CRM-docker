require('dotenv').config({ path: '.env' });
const { syncAnnualRenewals } = require('./cron/syncNotifications');

(async () => {
  console.log('Running syncAnnualRenewals...');
  await syncAnnualRenewals();
  console.log('Done!');
  process.exit(0);
})();
