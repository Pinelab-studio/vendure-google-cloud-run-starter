import { bootstrap, JobQueueService, Logger } from "@vendure/core";
import dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runningInWorker, runningLocal, config } = require("./vendure-config");
bootstrap(config)
  .then(async (app) => {
    if (runningInWorker || runningLocal) {
      // Start worker if running in worker or running locally
      Logger.info(`Started JobQueueService ${process.env.APP_ENV}`);
      await app.get(JobQueueService).start();
    }
    Logger.info(`Bootstrapped Vendure for env ${process.env.APP_ENV}`);
  })
  .catch((err) => {
    console.error(err);
    Logger.error(err);
  });
