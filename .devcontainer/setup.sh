#!/usr/bin/env bash
# postCreateCommand — egyszer fut le, amikor a Codespace létrejön.
# Cél: a "Nézzük meg a felületet" kérés minden előfeltétele automatikusan
# teljesüljön, hogy ne akadjunk el "Betöltés..."-nél úgy, mint korábban
# (akkor a Postgres/.env/seed nem volt előkészítve).
set -e

echo "==> Postgres telepítése"
sudo apt-get update -y
sudo apt-get install -y postgresql postgresql-contrib

echo "==> Postgres indítása"
sudo service postgresql start
for i in $(seq 1 30); do
  pg_isready -q -h localhost -p 5432 && break
  sleep 1
done

echo "==> kozmu szerepkör és adatbázis létrehozása (ha még nincs)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='kozmu'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE kozmu WITH LOGIN PASSWORD 'kozmu' SUPERUSER;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='szamlamenedzsment'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE szamlamenedzsment OWNER kozmu;"

echo "==> .env létrehozása"
if [ ! -f .env ]; then
  cat > .env <<'ENV'
DATABASE_URL="postgresql://kozmu:kozmu@localhost:5432/szamlamenedzsment"
ENV
fi

echo "==> npm install"
npm install

echo "==> Prisma migráció"
npx prisma migrate deploy

echo "==> Seed adatok (NYUDUVIZIG ügyfél + fogyasztási helyek)"
npm run db:seed

echo ""
echo "=================================================================="
echo " Kész! Az alkalmazás indítása: npm run dev"
echo " A 3000-es port automatikusan megnyílik egy előnézeti ablakban."
echo "=================================================================="
