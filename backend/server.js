import { PORT } from './src/config/constants.js';
import { createApp } from './src/app.js';
import { startRoomCleanupJob } from './src/jobs/roomCleanupJob.js';

const { app, container } = createApp();

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
  startRoomCleanupJob(container.cleanupService);
});
