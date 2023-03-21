#!/bin/bash

# format to use:
# ./deploy.sh <cloud run name> <database name> <memory> <gcloud project>

export ENV_VARS=$(paste -sd, .env)
gcloud run deploy $1 \
            --quiet \
            --image "eu.gcr.io/$4/vendure:latest" \
            --region "europe-west1" \
            --platform "managed" \
            --allow-unauthenticated \
            --project=$4 \
            --set-env-vars=$ENV_VARS \
            --add-cloudsql-instances="$4:europe-west4:$2" \
            --memory=$3
