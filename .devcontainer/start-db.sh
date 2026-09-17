#!/usr/bin/env bash
# postStartCommand — a Postgres szolgáltatás nem éli túl a Codespace
# leállítását/újraindítását, ezért ezt minden induláskor újra kell futtatni
# (a setup.sh-ban végzett role/db/seed lépéseket viszont nem, azok
# megmaradnak a konténer perzisztens lemezén).
set -e

sudo service postgresql start

# Várjuk meg, amíg tényleg fogad kapcsolatot, mielőtt bármi más nekifutna.
for i in $(seq 1 30); do
  if pg_isready -q -h localhost -p 5432; then
    break
  fi
  sleep 1
done

echo ""
echo "Postgres fut."

# Automatikusan elindítjuk a dev szervert is, hogy a Codespace megnyitása
# után rögtön elérhető legyen a 3000-es porton (nincs szükség kézi
# "npm run dev"-re) — csak akkor, ha még nem fut.
if ! curl -sf http://localhost:3000 >/dev/null 2>&1; then
  nohup npm run dev > /tmp/dev-server.log 2>&1 &
  disown
  echo "Dev szerver indítva a háttérben (log: /tmp/dev-server.log)."
else
  echo "Dev szerver már fut a 3000-es porton."
fi
