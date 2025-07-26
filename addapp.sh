#!/bin/bash

# Add a new app to the project
#
# Usage: ./addapp.sh <app_name>

APP_NAME=$1

if [[ $APP_NAME =~ [A-Z] ]]; then
    echo "App name should be all lowercase"
    exit 1
fi

if [[ $APP_NAME =~ \s ]]; then
    echo "App name should be a single word"
    exit 1
fi

if [ -z "$APP_NAME" ]; then
    echo "Usage: ./addapp.sh <app_name>"
    exit 1
fi

# Create a copy of the testapp template app in a new directory named after the app name
mkdir -p "$APP_NAME"
cp -r testapp/* "$APP_NAME"

# Update the app name in the app's package.json
sed -i "s/testapp/$APP_NAME/g" "$APP_NAME/backend/package.json"

# Update the app name in the app's docker-compose.yml
sed -i "s/testapp/$APP_NAME/g" "$APP_NAME/docker-compose.dev.yml"
sed -i "s/testapp/$APP_NAME/g" "$APP_NAME/docker-compose.prod.yml"

# Update the app name in the app's Makefile
sed -i "s/testapp/$APP_NAME/g" "$APP_NAME/Makefile"

