# Vendure Google Cloud Run Starter

- Includes GitHub actions:
  - To deploy to test and production
  - To run e2e tests and linting on pull requests

All commands are ready to copy/paste, but please read them carefully: they include some default values for region and resource usage that you might want to change. This guide uses `your-project` as example name, so make sure to ctrl+f all files for occurences of `your-project` when you're done with this guide.

## Prerequisites

* You have `gcloud` installed locally on your machine.
* The source code from this repository checked out on your local machine

## Create a Google Cloud project

1. Create a Google Cloud Project and store it's name in an anv var
2. `EXPORT GCLOUD_PROJECT=your-project` or `set GCLOUD_PROJECT your-project`
3. Make sure the project has the following services enabled: `gcloud services enable compute.googleapis.com sqladmin.googleapis.com run.googleapis.com run.googleapis.com cloudtasks.googleapis.com storage.googleapis.com containerregistry.googleapis.com cloudscheduler.googleapis.com --project=$GCLOUD_PROJECT`

## Create a MySQL database

1. Create an SQL instance. Make sure to get your local machine's public IP for enabling public access to from your IP to the DB.

```shell
gcloud sql instances create prod-db \
  --database-version=MYSQL_8_0 \
  --tier=db-g1-small \
  --region=europe-west4 \
  --root-password=your-passw \
  --assign-ip \
  --storage-auto-increase \
  --storage-size=20GB \
  --authorized-networks=your-public-ip \
  --maintenance-window-day=MON \
  --maintenance-window-hour=2 \
  --availability-type=zonal \
  --backup \
  --retained-backups-count=30 \
  --storage-type=SSD \
  --project=$GCLOUD_PROJECT
```

2. Create a database:

```shell
gcloud sql databases create prod-db \
--instance=prod-db \
--charset=utf8mb4 \
--collation=utf8mb4_unicode_ci \
--project=$GCLOUD_PROJECT
```

3. Create a user specifically for this database.
```shell
gcloud sql users create vendure-prod --instance=prod-db, -i prod-db --host=% --password=YOUR_SECRET_PASS --project=$GCLOUD_PROJECT
```

5.  Repeat these steps if you'd also like a test environment.

## Asset storage

Create a buckt for Vendure's assets and make the bucket publicly readable

1. `gcloud storage buckets create gs://prod-assets --location=europe-west4 --project=$GCLOUD_PROJECT`
2. `gcloud storage buckets add-iam-policy-binding gs://prod-assets --member=allUsers --role=roles/storage.objectViewer`

## Env vars

Copy the .env.example file and fill in your values.

## Test locally

`yarn build:admin`
`yarn generate-migration:prod initial-startup`
`yarn run-migration:prod`
`yarn serve:prod`

You should be able to access `http://localhost:3000/admin`, `http://localhost:3000/admin-api` and `http://localhost:3000/shop-api`

Test asset upload:

1. Before you start the server, run `gcloud auth application-default login`
2. Start Vendure and upload an asset. It should upload to your specified bucket

## Deployments

Create Service accounts for deployments

```shell
gcloud iam service-accounts create devops-sa \
--description="Automated deploys to cloud run and container building" \
--display-name="Devops service account" \
--project=$GCLOUD_PROJECT
```

Grant roles

```shell
gcloud projects add-iam-policy-binding $GCLOUD_PROJECT \
    --member="serviceAccount:devops-sa@$GCLOUD_PROJECT.iam.gserviceaccount.com" \
    --role="roles/editor"
```

Create JSON key

```shell
gcloud iam service-accounts keys create key.json \
    --iam-account=devops-sa@$GCLOUD_PROJECT.iam.gserviceaccount.com
```

Copy the contents of the `key.json` file and store it in a repository secret under the name `GCLOUD_DEVOPS_KEY` https://github.com/YOUR-repository/settings/secrets/actions

Delete the key file!

Copy the contents of your `.env` file, **without comments and empty lines**, into a repository secret named `ENV_PROD` (`ENV_TEST` for the test env).

Go through the following files and replace any variables specific to your project:

- All files in `.github/workflows`
- `deploy.sh`
- `build-docker.sh`

## Keep alive for performance

To prevent cold starts, you can call your Vendure instance every minute. This can be done with a Cloud Scheduler job:

```shell
gcloud scheduler jobs create http vendure-prod-keep-alive \
    --location=europe-west1 \
    --schedule="* 6-23 * * *" \
    --uri=https://your-project.a.run.app/admin \
    --project=$GCLOUD_PROJECT
```

## Google Cloud Console

Some useful and important links to view your application health:

- https://console.cloud.google.com/logs/ Stack driver logging. All logs are written to a logfile named `winston_test` or `winston_prod`, depending on your APP_ENV value. You can display instance (worker or main) and plugin fiels by including `labels.module` and `labels.name` in the summary fields in Stack Driver.
- https://console.cloud.google.com/run to view your Cloud Run services and domains
- https://console.cloud.google.com/sql/instances to view your database server instances
- https://console.cloud.google.com/storage/browser to view your buckets and assets

## Admin UI compilation

When you add plugins that have custom UI, you need to add the plugin to `src/compile-admin-ui.ts` and run `yarn build:admin`. We commit the compiled files in `__admin-ui/dist` to git, to prevent recompilation on every deploy, because it can take quite long and is only necessary when UI changes have been introduces in `compile-admin-ui.ts`.

If you prefer to build the admin UI on every deploy, take a look at https://www.vendure.io/docs/plugins/extending-the-admin-ui/#compiling-as-a-deployment-step
