#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'if(Number(process.versions.node.split(".")[0])<20) throw Error("Node.js >=20 required"); console.log("Node",process.version)'
python3 --version
test -f apps/fps-demo/dist/vendor/babylon.js
test -f apps/fps-demo/dist/index.html
printf '%s\n' 'Ready. No npm dependencies or API secrets required.' 'Run: npm run check && npm test' 'Preview: npm run serve:fps'
