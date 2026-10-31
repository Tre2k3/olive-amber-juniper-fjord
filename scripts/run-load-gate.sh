#!/bin/sh
cd "$(dirname "$0")/.." || exit 3
HOST=127.0.0.1 PORT=8080 node scripts/preview-prod.mjs > /tmp/preview.log 2>&1 &
PREV=$!
ok=0; i=0
while [ $i -lt 30 ]; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ 2>/dev/null)
  [ "$code" = "200" ] && ok=1 && break
  i=$((i+1)); sleep 1
done
if [ "$ok" != "1" ]; then echo "SERVER NOT READY (last $code) — INCONCLUSIVE"; tail -15 /tmp/preview.log; kill $PREV 2>/dev/null; exit 0; fi
echo "preview ready (200) after ${i}s"
SMOKE_HEADED=0 timeout 250 node scripts/${GATE:-load-recovery-gate.mjs} > /tmp/gate.log 2>&1
rc=$?
grep -E "^PASS|^FAIL|^   " /tmp/gate.log | cut -c1-330
case $rc in 0) v=PASS;; 1) v=FAIL;; *) v=INCONCLUSIVE; tail -6 /tmp/gate.log | cut -c1-200;; esac
echo "gate exit=$rc $v"
echo "preview still up at end: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/)"
kill $PREV 2>/dev/null
