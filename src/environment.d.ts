export { };

// Here we declare the members of the process.env object, so that we
// can use them in our application code in a type-safe manner.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ENV: string;
            SUPERADMIN_USERNAME: string;
            SUPERADMIN_PASSWORD: string;
            DB_HOST: string;
            DB_NAME: string;
            DB_USERNAME: string;
            DB_PASSWORD: string;
            WORKER_HOST: string;
            CLOUD_TASKS_SECRET: string
            GCLOUD_PROJECT: string;
            SMTP_PASSWORD: string;
            SMTP_USER: string
            SMTP_HOST: string
            BUCKET: string
            SOCKET_CONNECTION_NAME: string;
        }
    }
}
