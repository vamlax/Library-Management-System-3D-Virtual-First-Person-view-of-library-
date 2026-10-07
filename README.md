# Central Library: 3D Library Management System

A first-person 3D library. You walk between shelves, look at real books, click one to open a
**Book Card**, and borrow / return / reserve it. Every action writes to a real database.

## Run it (Windows)
1. Install **Node.js (LTS)** from https://nodejs.org (one time).
2. Unzip this folder, **double-click `start.bat`**.
3. The browser opens `http://localhost:3000` (if not, open it yourself). Use **Chrome or Edge**.

(Or in a terminal: `npm install` then `npm start`.)

## Controls
| Key | Action |
|---|---|
| Click the scene | start walking (mouse captured) |
| W A S D / arrows | move |
| Mouse | look around |
| Shift | run |
| Click a book (crosshair on it) | open its Book Card |
| P | open "My Library" (loans, fines, history) |
| Esc | free the mouse cursor |

## Demo accounts (buttons on the login screen)
| Account | Email | Password | Good for showing |
|---|---|---|---|
| Student | student@library.test | student123 | borrow, return, reserve |
| Late-return student | ravi@library.test | student123 | overdue book, **fine calculation** on return |
| Librarian | librarian@library.test | admin123 | overdue list, add/remove copies |

**Suggested demo (3 minutes):** sign in as Student → walk to *Programming* → click **Clean Code** →
Borrow → press P to show due date → return it. Then walk to *AI & ML*, click **Deep Learning**
(red tag = unavailable) → Reserve. Sign out, sign in as Ravi → My Library → return the overdue
OS book → fine ₹14 appears. Finally, sign in as Librarian to show the overdue list.

Books with a **green tag** on the spine are available; **red tag** means all copies are out.

## How it works (for your viva)
```
Browser: React + Three.js (React Three Fiber)  <--REST/JSON-->  Node.js + Express  <-->  SQLite file
  3D scene + Book Card UI                                         business rules          library.db
```
* **Frontend:** the room, shelves and books are built in code from boxes. The shelf layout is
  data-driven (`client/src/config/layout.js`). Books come from the database: each book's
  `section`, `shelf` (0 = bottom board … 4 = top) and `slot` (0–11, left to right along the board) decide where it
  appears in 3D. `placeBooks()` packs the 12 books of a board edge to edge, so there are no gaps and no overlaps.
* **Selection:** a ray is cast from the crosshair (screen centre); the first book it hits is highlighted
  and slides forward. Shelf frames block the ray so you can't pick books through the shelf.
* **Backend rules** (`server/index.js`): 14-day loans, ₹2/day fine, max 3 books, no borrowing while
  something is overdue, reservations are queued and marked *ready* when a copy is returned.
* **Availability** is derived: `totalCopies - active loans`, so it can never go out of sync.
* **Security:** passwords are salted + scrypt hashed; login returns an HMAC-signed token.
* **Database:** SQLite (via sql.js) in `server/library.db`: tables `users`, `books`, `loans`, `reservations`.

## Customising
* Sections / shelf positions: `client/src/config/layout.js` (section names must match the DB).
* Books: `server/catalog/*.js`; users and demo loans: `server/seed.js`. Then `npm run reset-db` and restart.
* Fine rate, loan days, max loans: top of `server/index.js`.
* Book ISBNs/descriptions are sample data.

## Changing the code (developers)
```
npm install                      # server deps
cd client && npm install         # client deps
npm start                        # terminal 1: API on :3000
cd client && npm run dev         # terminal 2: live 3D client on :5173
npm run build                    # rebuild client/dist after changes
```
Folders: `server/` (API + DB), `client/src/scene/` (3D), `client/src/ui/` (Book Card, HUD, login, profile).

## Known limits
One library floor, no book cover images (covers are generated), no email notifications.

## The 600-book catalog
* 10 sections x 60 books = **600 real database rows** (5 shelves x 12 books per section). Nothing on the shelves is decoration:
  every spine is a selectable book. (An optional non-database filler is available via `DECOR.fillerBooks` in `layout.js`; it is off.)
* Catalog data: `server/catalog/<section>.js`, one file per section, rows listed in shelf order (rows 1-12 = shelf 1, …).
  `server/seed.js` inserts them on a fresh database. Edit a section file, then `npm run reset-db` and restart.
* `npm run check-catalog` validates the catalog (60 per section, unique titles / ISBNs / shelf positions) without a database.
* **ISBNs:** the original 46 ISBNs are real. All other books (including the original ones that had none) have
  *generated placeholder* ISBN-13s in the `979-8-0000-xxxx` range with valid check digits. Titles, authors, categories and years
  are real-book metadata but editions/years are approximate; descriptions are one-line summaries. Treat all as sample data.
* Already ran an older version? Your `server/library.db` still has 60 books. Run `npm run reset-db` (this deletes loans/users) and restart.
* After changing anything in `client/src`, run `npm run build` (start.bat does this automatically if `client/dist` is missing).
Fine is calculated when a book is returned (and shown live on the card/profile while overdue).
