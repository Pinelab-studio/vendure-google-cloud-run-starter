import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import {
  DefaultLogger,
  DefaultSearchPlugin,
  LogLevel,
  VendureConfig,
  VendureLogger,
} from "@vendure/core";
import { defaultEmailHandlers, EmailPlugin } from "@vendure/email-plugin";
import { json } from "body-parser";
import path from "path";
import { CloudTasksPlugin } from "vendure-plugin-google-cloud-tasks";
import {
  GoogleStoragePlugin,
  GoogleStorageStrategy,
} from "vendure-plugin-google-storage-assets";
import { cloudLogger } from "./logger";
import { AllocateStockOnSettlementStrategy } from "./stock-allocation/allocate-stock-on-settlement.strategy";

let logger: VendureLogger;
export let runningLocal = false;
export let isProd = false;
export let runningInWorker = false;
if (process.env.K_SERVICE) {
  // This means we are in CloudRun
  logger = cloudLogger;
  runningInWorker = process.env.K_SERVICE.includes("worker"); // Name of worker is worker or worker-test
} else {
  logger = new DefaultLogger({ level: LogLevel.Debug });
  runningLocal = true;
}
if (process.env.APP_ENV === "prod") {
  isProd = true;
}

export const config: VendureConfig = {
  logger,
  orderOptions: {
    stockAllocationStrategy: new AllocateStockOnSettlementStrategy(),
  },
  apiOptions: {
    port: (process.env.PORT as unknown as number) ?? 3000,
    adminApiPath: "admin-api",
    adminApiPlayground: !!runningLocal,
    adminApiDebug: false, // turn this off for production
    shopApiPath: "shop-api",
    shopApiPlayground: true, // turn this off for production
    shopApiDebug: false, // turn this off for production
    shopListQueryLimit: 500,
    middleware: [
      {
        route: `/`,
        handler: json({ limit: "1mb" }),
      },
    ],
  },
  authOptions: {
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    tokenMethod: "bearer",
  },
  assetOptions: {
    permittedFileTypes: ["image/*", "video/*", "audio/*", ".pdf", ".epub"],
    uploadMaxFileSize: 36700160,
  },
  dbConnectionOptions: {
    type: "mysql",
    synchronize: false,
    logging: false,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    migrations: [path.join(__dirname, "../migrations/*.ts")],
    socketPath: runningLocal
      ? undefined
      : `/cloudsql/${process.env.SOCKET_CONNECTION_NAME}`,
  },
  taxOptions: {},
  shippingOptions: {},
  paymentOptions: {
    paymentMethodHandlers: [],
  },
  plugins: [
    CloudTasksPlugin.init({
      taskHandlerHost: process.env.WORKER_HOST,
      projectId: process.env.GCLOUD_PROJECT,
      location: "europe-west1",
      authSecret: process.env.CLOUD_TASKS_SECRET,
      queueSuffix: process.env.APP_ENV,
    }),
    // The plugin inlcusion is needed to expose the `thumbnail` field on Assets
    GoogleStoragePlugin,
    AssetServerPlugin.init({
      storageStrategyFactory: () =>
        new GoogleStorageStrategy({
          bucketName: process.env.BUCKET,
          thumbnails: {
            height: 500,
            width: 500,
          },
        }),
      route: "assets",
      assetUploadDir: "/tmp/vendure/assets",
    }),
    DefaultSearchPlugin,
    EmailPlugin.init({
      // Only for dev
      // devMode: true,
      // outputPath: path.join(__dirname, '../static/email/test-emails'),
      // route: 'mailbox',
      // Live settings
      transport: {
        type: "smtp",
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        logging: false,
        debug: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      handlers: defaultEmailHandlers,
      templatePath: path.join(__dirname, "../static/email/templates"),
      globalTemplateVars: {
        // The following variables will change depending on your storefront implementation.
        // Here we are assuming a storefront running at http://localhost:8080.
        fromAddress: '"example" <noreply@example.com>',
        verifyEmailAddressUrl: "http://localhost:8080/verify",
        passwordResetUrl: "http://localhost:8080/password-reset",
        changeEmailAddressUrl:
          "http://localhost:8080/verify-email-address-change",
      },
    }),
    // Production ready, precompiled admin UI
    AdminUiPlugin.init({
      route: "admin",
      port: 3002,
      adminUiConfig: {
        loginImageUrl: "https://source.unsplash.com/NOWf9wVANYQ",
        brand: "Pinelab Vendure",
        hideVendureBranding: false,
        hideVersion: false,
      },
      app: {
        path: path.join(__dirname, "../__admin-ui/dist"),
      },
    }),
  ],
};

if (config.dbConnectionOptions.synchronize) {
  throw Error(
    "Don't ever synchronize the DB!!! Use 'yarn migration:generate:test' to migrate the database"
  );
}
