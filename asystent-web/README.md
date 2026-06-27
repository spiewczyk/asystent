	# 🧠 Asystent — strona do Twojego „Drugiego Mózgu" w Notion

Prywatna strona-czat. Piszesz w skrócie, co masz do zrobienia, a AI:

1. rozpoznaje, czy to **zadanie / projekt / rutyna / pomysł / zasób / zakup**,
2. zgaduje pola (priorytet, termin, obszar…), a o brakujące **dopytuje**,
3. pokazuje to jako edytowalne **bloki** w stylu Notion,
4. po Twoim kliknięciu **„Zatwierdź"** zapisuje wpis do właściwej bazy w Notion.

Nic nie trafia do Notion bez Twojego potwierdzenia.

---

## Co musisz przygotować (3 rzeczy)

### 1. Integracja Notion (żeby strona mogła pisać do Twojego Notion)

1. Wejdź na **https://www.notion.so/my-integrations** → **New integration**.
2. Nazwa: `Asystent`. Wybierz swój workspace. Typ: **Internal**.
3. Skopiuj **Internal Integration Secret** (zaczyna się od `secret_` lub `ntn_`) — to będzie ``.
4. **WAŻNE — udostępnij bazy integracji:** otwórz stronę **🧠 Drugi Mózg** w Notion → menu `•••` (prawy górny róg) → **Connections / Połączenia** → **Add connection** → wybierz `Asystent`.
   Dzięki temu, że strona jest nadrzędna, integracja dostaje dostęp do wszystkich baz pod spodem (Zadania, Projekty, Rutyny itd.).

### 2. Klucz AI — Google Gemini (DARMOWY, bez karty kredytowej)

1. Wejdź na **https://aistudio.google.com/apikey** → zaloguj się kontem Google.
2. **Create API key** → skopiuj — to ``.
3. Nie włączaj płatności. Darmowy limit (model `gemini-2.0-flash`) to ok. **1500 zapytań/dobę** — z naddatkiem na osobisty użytek.

> Cała aplikacja działa **za darmo**: Vercel (plan Hobby), Notion API i Gemini — wszystko ma darmowe limity wystarczające do prywatnego użytku.

### 3. Hasło do strony

Wymyśl dowolne hasło (`APP_PASSWORD`) i długi losowy ciąg (`AUTH_SECRET`, min. 32 znaki).

---

## Wdrożenie na Vercel (bez kodowania)

1. Wrzuć folder `asystent-web` na **GitHub** (np. przez stronę github.com → New repository → upload files), albo użyj Vercel CLI.
2. Wejdź na **https://vercel.com** → zaloguj przez GitHub → **Add New… → Project** → wybierz repo.
3. Vercel sam wykryje Next.js. Przed kliknięciem **Deploy** rozwiń **Environment Variables** i dodaj:

   | Name | Value |
   |------|-------|
   | `APP_PASSWORD` | Twoje hasło do strony |
   | `AUTH_SECRET` | długi losowy ciąg (min. 32 znaki) |
   | `NOTION_TOKEN` | sekret integracji Notion |
   | `GEMINI_API_KEY` | darmowy klucz z Google AI Studio |
   | `GEMINI_MODEL` | `gemini-2.0-flash` (opcjonalnie) |

4. **Deploy**. Po chwili dostaniesz adres typu `https://asystent-twojnick.vercel.app`.
5. Wejdź, podaj hasło — gotowe. Możesz dodać do ekranu głównego telefonu jak aplikację.

> Strona jest chroniona hasłem (cookie). Sekrety (Notion/AI) są tylko po stronie serwera Vercel — nie trafiają do przeglądarki.

---

## Uruchomienie lokalnie (opcjonalnie, do testów)

```bash
cd asystent-web
cp .env.example .env.local   # i uzupełnij wartości
npm install
npm run dev
# otwórz http://localhost:3000
```

---

## Jak to dostosować

- **Dodać/zmienić bazy lub pola:** edytuj `lib/schema.ts` (jeden plik — opis każdej bazy i jej pól).
- **Zmienić zachowanie AI / styl dopytywania:** `lib/prompt.ts`.
- **Wygląd:** `app/globals.css`.

## Bazy, które strona obsługuje

Zadania, Projekty, Rutyny, Pomysły, Zasoby/Wiedza, Lista życzeń oraz Inbox (gdy typ jest niejasny).
Pola relacji **Obszar** i **Projekt** podpowiadają się z aktualnych wpisów w Twoim Notion.

## Uwagi techniczne

- Next.js 14 (App Router), API Notion `2022-06-28` (`@notionhq/client` v2), Google Gemini przez REST (bez dodatkowego SDK).
- Chcesz inny darmowy model? W `app/api/parse/route.ts` można podmienić Gemini na np. Groq (Llama, też darmowy) — endpoint i format są podobne.
- Daty: AI zwraca format ISO; możesz je poprawić ręcznie w bloku przed zatwierdzeniem.
- Jeśli zmienisz strukturę w Notion (nazwy pól / opcji), zaktualizuj `lib/schema.ts`.
