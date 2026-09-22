#!/bin/bash
if [ "$(id -u)" -eq 0 ]; then
  echo "This script must not be run as root."
  exit 1
fi

git remote set-url origin https://github.com/rgsystemes/upsignon-pro-dashboard
git fetch origin
git reset --hard origin/production
git clean -df
git remote prune origin

# Use a separate script so the update immediatly benefits from the new update script
if [ $? -eq 0 ];
then
  ./post-update.sh
else
  echo "The update failed."
fi
