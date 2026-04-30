#!/bin/bash
cd /home/daytona/brick-breaker
npm install
npx expo prebuild --platform web
npx expo export --platform web
cd dist
npx serve -l 3000 &
sleep 2
echo "Server started on port 3000"
