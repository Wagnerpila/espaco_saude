import 'dotenv/config';
import { createApp } from './app.js';
import { startCronJobs } from './cron.js';

const port = process.env.PORT || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`[espaco-saude-server] ouvindo na porta ${port}`);
  startCronJobs();
});
