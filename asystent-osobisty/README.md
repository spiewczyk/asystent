# Asystent dnia — Etap 1

Osobisty asystent dnia jako aplikacja PWA (komputer + telefon), zintegrowany z Twoim Notion „Drugi Mózg" przez oficjalne, darmowe API. Działa na Twoim obecnym planie Notion.

## Co działa w Etapie 1

- Pulpit „Dziś i zaległe" — zadania na dziś i przeterminowane z godziną, priorytetem i obszarem.
- Liczniki: do zrobienia, zaległe, wysoki priorytet, rutyny na dziś.
- Dodawanie zadania (nazwa, data, godzina, priorytet, obszar) — zapis prosto do bazy Zadania.
- Odhaczanie zadania jako „Zrobione" (zmiana leci do Notion).
- Instalacja na telefonie („dodaj do ekranu głównego") — działa jak natywna apka.

Etap 2 (asystent po ludzku + podsumowania AI) i Etap 3 (przypomnienia) dojdą później.

---

## Uruchomienie — 4 kroki (raz, ~15 min)

### Krok 1 — Utwórz integrację Notion i skopiuj token

1. Wejdź na https://www.notion.so/my-integrations i kliknij „New integration".
2. Nazwa np. „Asystent dnia", workspace: Twój. Typ: „Internal".
3. Po utworzeniu skopiuj „Internal Integration Secret" (zaczyna się od `ntn_` lub `secret_`).
   To Twój `NOTION_TOKEN`. Trzymaj go w tajemnicy — wkleisz go tylko w panelu Vercel.

### Krok 2 — Udostępnij bazy integracji i pobierz ich ID

Dla każdej z trzech baz: **Zadania**, **Rutyny**, **Obszary**:

1. Otwórz bazę w Notion jako pełną stronę.
2. Prawy górny róg → menu „•••" → „Connections" (Połączenia) → wybierz swoją integrację „Asystent dnia". Bez tego API jej nie zobaczy.
3. ID bazy weź z adresu w przeglądarce. URL wygląda tak:
   `https://www.notion.so/twojaprzestrzen/NAZWA-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?v=...`
   ID to ciąg 32 znaków (litery+cyfry) tuż przed `?v=`.

Wartości, które rozpoznałem w Twoim workspace (do szybkiego wklejenia — i tak warto sprawdzić po pierwszym uruchomieniu):

- `DB_ZADANIA` = `4c0f02b2a221476c8f4a014a440e3e46`
- `DB_RUTYNY` = `07edf9a616c844b7945e95532bc565e1`
- `DB_OBSZARY` = `21acf93c93d64c5a860a2e88a7f952ac`

Pozostałe bazy w systemie (przydadzą się w Etapie 2, gdy asystent będzie sortował wpisy po bazach):

- 📥 Inbox = `d074271340124a8cb310ec7e6fd25d4c`
- 🚀 Projekty = `d33fb35b170e47c4a1ea88451cf8a644`
- 💡 Pomysły = `24592e207751460db2d4a12097a375a3`
- 📚 Zasoby / Wiedza = `751e8e7677494314bb1eecfcaae08c92`
- 🛍️ Lista życzeń = `2b0c5e8615a444e39f9a261606155ba5`
- 👗 Moda / Garderoba = `43cb6354b9dc4be9ab75b352fca6f72f`

> Jeśli po wdrożeniu pulpit pokaże błąd „object_not_found", to znaczy, że albo integracja nie jest podłączona do bazy (Krok 2.2), albo ID jest inne — wtedy weź ID prosto z adresu (Krok 2.3).

### Krok 3 — Wdróż na Vercel (darmowe)

Najprościej przez przeglądarkę:

1. Załóż darmowe konto na https://vercel.com (możesz przez GitHub).
2. Wrzuć ten folder na GitHub jako repozytorium (albo użyj „Vercel CLI", patrz niżej).
3. W Vercel: „Add New… → Project" → zaimportuj to repo. Framework: „Other" (nic nie trzeba ustawiać).
4. Przed „Deploy" dodaj zmienne środowiskowe (Settings → Environment Variables) — te same co w `.env.example`:
   `NOTION_TOKEN`, `DB_ZADANIA`, `DB_RUTYNY`, `DB_OBSZARY`.
5. Kliknij „Deploy". Po chwili dostaniesz adres typu `https://twoj-asystent.vercel.app`.

Alternatywnie przez terminal (Vercel CLI):
```
npm i -g vercel
vercel            # pierwszy deploy (zaloguje i utworzy projekt)
vercel env add NOTION_TOKEN
vercel env add DB_ZADANIA
vercel env add DB_RUTYNY
vercel env add DB_OBSZARY
vercel --prod     # wdrożenie produkcyjne
```

### Krok 4 — Otwórz i zainstaluj na telefonie

- Komputer: wejdź na adres `*.vercel.app`.
- iPhone (Safari): otwórz adres → przycisk „Udostępnij" → „Dodaj do ekranu początkowego".
- Android (Chrome): otwórz adres → menu „⋮" → „Zainstaluj aplikację" / „Dodaj do ekranu głównego".

Od teraz masz ikonę na telefonie i komputerze, ten sam asystent w obu miejscach.

---

## Test lokalny (opcjonalnie)

```
npm i -g vercel
# utwórz plik .env.local z wartościami jak w .env.example
vercel dev
```
Otwórz http://localhost:3000.

## Struktura

```
public/          frontend PWA (index.html, manifest, sw.js, ikony)
api/tasks.js     lista + dodawanie + odhaczanie zadań
api/areas.js     lista obszarów (do rozwijanej listy)
lib/notion.js    pomocnik do API Notion (token, strefa czasu)
.env.example     wzór zmiennych środowiskowych
```

## Bezpieczeństwo

- Token Notion i ID baz żyją tylko po stronie serwera (zmienne środowiskowe Vercel). Frontend nigdy ich nie widzi.
- Nie commituj pliku `.env` — jest w `.gitignore`.

## Rozwiązywanie problemów

- „Brak NOTION_TOKEN…" → nie ustawiono zmiennych w Vercel (Krok 3.4), po dodaniu zrób redeploy.
- „object_not_found" / puste listy → integracja niepodłączona do bazy (Krok 2.2) lub złe ID bazy.
- Złe godziny → aplikacja liczy czas w strefie Europe/Warsaw; sprawdź godzinę w telefonie.
- Brak obszarów w rozwijanej liście → ustaw `DB_OBSZARY` i podłącz integrację do bazy Obszary (jest opcjonalna).
