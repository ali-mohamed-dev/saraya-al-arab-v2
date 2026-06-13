#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_lr1xKzAqB8Ph@ep-snowy-sea-apwp8zjf-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 2>&1 | tee dev.log
  echo "[$(date)] Restarting in 2s..." >> /tmp/restarts.log
  sleep 2
done
