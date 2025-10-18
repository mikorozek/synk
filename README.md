README — lokalny dev dla projektu synk

Krótko: jak uruchomić Postgres (Docker), wykonać migracje Prisma, uruchomić serwer i przykładowego klienta.

Wymagania
- Docker (i docker-compose / docker compose)
- Node.js (>=16) i npm

Szybkie kroki

1) Uruchom Postgresa (z katalogu repozytorium)

Jeśli używasz docker compose v2:

```bash
cd postgres
docker compose up -d
```

Albo (starsze):

```bash
cd postgres
docker-compose up -d
```

2) Sprawdź, że kontener działa

```bash
sudo docker ps
# lub sprawdź logi
docker compose logs -f
```

3) Upewnij się, że w pliku `.env` masz poprawny `DATABASE_URL` (domyślnie przykładowy adres lokalny jest już zapisany)

4) Zainstaluj zależności Node.js

```bash
cd /path/to/synk
npm install
```

5) Wykonaj migracje i wygeneruj Prisma Client

```bash
# tworzy i stosuje migrację deweloperską
npx prisma migrate dev --name init --skip-seed
# lub użyj skryptu npm
npm run prisma:migrate

# wygeneruj klienta (opcjonalnie)
npx prisma generate
# lub
npm run prisma:generate
```

6) Uruchom serwer z formularzem

```bash
npm run start:server
# otwórz http://localhost:3000 w przeglądarce
```

7) Uruchom przykładowego klienta (node script tworzący Topic/Event/Source)

```bash
node scripts/client.js
# lub
npm run client
```

Szybkie polecenia DB / debug

- Lista tabel (wewnątrz kontenera):

```bash
sudo docker exec -i <container_name> psql -U admin -d database -c "\dt"
# przykład kiedy używasz domyślnego stacka w repo:
sudo docker exec -i postgres-postgres-1 psql -U admin -d database -c "\dt"
```

- Wykonanie zapytania z hosta (jeśli port wystawiony):

```bash
PGPASSWORD=password psql -h localhost -U admin -d database -c "SELECT * FROM \"Topic\";"
```

- Wywołanie endpointu formularza przez curl (tworzy Topic):

```bash
curl -X POST http://localhost:3000/submit -d "title=FormTopic&eventTitle=Ev&eventUrl=https://e&eventSummary=s&sourceUrl=https://s&sourceType=web"
```

Uwagi
- Jeżeli nie widzisz tabel w GUI (VS Code extension itp.), sprawdź, że łączysz się do bazy `database` (nie `postgres`) i odśwież widok po połączeniu.
- W razie problemów z uprawnieniami do dockera uruchamiaj polecenia z sudo lub ustaw poprawne uprawnienia dla użytkownika.

Masz ochotę, żebym dopisał jeszcze krok „seed” (plik seed.js) lub instrukcję konfiguracji połączenia w konkretnym VS Code rozszerzeniu? Podaj nazwę rozszerzenia, to dopiszę dokładne kroki.
