# Документация по backend

## database.js — таблицы SQLite

Файл `backend/src/data/database.js` создаёт базу `cafe.sqlite` и 8 таблиц.

---

## menu

**Кратко:** справочник блюд и напитков, которые продаёт кафе. Цены хранятся в JSON (одна цена или по объёмам).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | Уникальный номер позиции (автоувеличение) |
| `name` | TEXT | Название (например, «Капучино») |
| `category` | TEXT | Категория в меню (напитки, десерты…) |
| `is_volumes` | INTEGER | `1` — есть объёмы (0.3 / 0.5), `0` — одна цена |
| `price_json` | TEXT | Цены в формате JSON |

---

## orders

**Кратко:** заказы клиентов — шапка: кто заказал, статус, сумма, оплата и кто закрыл.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | TEXT | Уникальный ID заказа (UUID) |
| `order_number` | TEXT | Человекочитаемый номер (`20260530-0001`) |
| `status` | TEXT | Статус: `pending`, `ready`, `paid`, `closed` |
| `total_price` | REAL | Итоговая сумма заказа |
| `payment_method` | TEXT | Оплата: `cash`, `card`, `other` |
| `paid_at` | TEXT | Дата и время оплаты (ISO) |
| `closed_by_employee_id` | INTEGER | ID сотрудника, закрывшего заказ |
| `closed_at` | TEXT | Дата и время закрытия (ISO) |
| `created_at` | TEXT | Дата и время создания (ISO) |

---

## order_items

**Кратко:** строки заказа — что именно заказали. Название и цена сохраняются в snapshot, чтобы заказ не менялся при правке меню.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | Уникальный номер строки |
| `order_id` | TEXT | Ссылка на заказ (`orders.id`) |
| `menu_id` | INTEGER | Ссылка на позицию меню (может стать пустой) |
| `name_snapshot` | TEXT | Название товара на момент заказа |
| `price_snapshot` | REAL | Цена на момент заказа |
| `volume` | TEXT | Объём порции, если у блюда есть объёмы |

---

## employees

**Кратко:** сотрудники кафе — ФИО, должность, статус и личный код для идентификации.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | Уникальный номер сотрудника |
| `full_name` | TEXT | ФИО |
| `position` | TEXT | Должность |
| `status` | TEXT | `active` — работает, `vacation` — отпуск, `dismissed` — уволен |
| `personal_code` | TEXT | Личный код (уникальный) |
| `created_at` | TEXT | Когда добавили в систему |
| `updated_at` | TEXT | Когда последний раз меняли запись |

---

## inventory_items

**Кратко:** справочник склада — что храним: ингредиенты или готовые товары.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | Уникальный номер позиции |
| `name` | TEXT | Название (мука, молоко, стакан…) |
| `item_type` | TEXT | `ingredient` — ингредиент, `finished_good` — готовый товар |
| `unit` | TEXT | Единица измерения: шт, кг, л… |
| `created_at` | TEXT | Когда позиция добавлена в справочник |

---

## inventory_stock

**Кратко:** текущий остаток по каждой позиции склада (одна строка на один товар).

| Поле | Тип | Описание |
|------|-----|----------|
| `item_id` | INTEGER | Ссылка на `inventory_items.id` (первичный ключ) |
| `quantity` | REAL | Сколько сейчас на складе |
| `updated_at` | TEXT | Когда остаток обновляли последний раз |

---

## inventory_movements

**Кратко:** журнал движений склада — приход и расход. Поля `reference_*` — не отдельная таблица «документов», а пометка «из‑за чего» списали/оприходовали.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | Уникальный номер записи |
| `item_id` | INTEGER | Какой товар двигали |
| `movement_type` | TEXT | `in` — приход, `out` — расход |
| `quantity` | REAL | Количество в движении |
| `reason` | TEXT | Комментарий / причина |
| `reference_type` | TEXT | Откуда движение: `order`, `manual` и т.д. (без FK) |
| `reference_id` | TEXT | ID источника (например UUID заказа); может быть NULL |
| `created_at` | TEXT | Когда произошло движение |

---

## menu_ingredients

**Кратко:** рецептура — сколько какого ингредиента уходит на одну порцию блюда из меню.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | INTEGER | Уникальный номер строки рецепта |
| `menu_id` | INTEGER | Ссылка на блюдо (`menu.id`) |
| `inventory_item_id` | INTEGER | Ссылка на ингредиент (`inventory_items.id`) |
| `qty_per_unit` | REAL | Сколько ингредиента на 1 порцию |
| `volume` | TEXT | Для какого объёма блюда (если объёмы разные) |
| `created_at` | TEXT | Когда запись рецепта создана |

---

## Связи между таблицами (кратко)

| Откуда | Поле | Куда |
|--------|------|------|
| `order_items` | `order_id` | `orders.id` |
| `order_items` | `menu_id` | `menu.id` |
| `orders` | `closed_by_employee_id` | `employees.id` |
| `inventory_stock` | `item_id` | `inventory_items.id` |
| `inventory_movements` | `item_id` | `inventory_items.id` |
| `menu_ingredients` | `menu_id` | `menu.id` |
| `menu_ingredients` | `inventory_item_id` | `inventory_items.id` |

---

## Вопросы и ответы

### 1) Поле `orders.name`

**Удалено.** Колонки в таблице и в API больше нет. При старте backend для старых БД выполняется `ALTER TABLE orders DROP COLUMN name`.

---

### 2) `inventory_movements` — что за «документ»?

**Отдельной таблицы «документов» в проекте нет.**

`reference_type` + `reference_id` — это пара полей «причина / ссылка» в той же строке журнала:

| Ситуация | `reason` | `reference_type` | `reference_id` |
|----------|----------|------------------|----------------|
| Списание при создании заказа | `order` | `order` | UUID заказа (`orders.id`) |
| Первичный остаток при добавлении позиции | `initial_stock` | `manual` | NULL |
| Ручное пополнение склада | текст или `restock` | `manual` | NULL |

Так можно в админке отфильтровать движения по заказу или понять, что списание было из‑за заказа, а не ручной правки. Это не PDF и не отдельная сущность «документ» — только метаданные в `inventory_movements`.

---

## Архитектура backend

**Стек:** Node.js, Express, SQLite (`sqlite3`).

**Слои (сверху вниз):**

```
HTTP-запрос
  → routes/          — URL, подключение middleware
  → controllers/     — проверка входных данных, HTTP-коды ответа
  → services/        — бизнес-логика, SQL, транзакции
  → data/database.js — подключение к SQLite, создание таблиц
```

**Точки входа:**

| Файл | Назначение |
|------|------------|
| `backend/server.js` | Загрузка `.env`, инициализация БД, запуск сервера на `PORT` (по умолчанию 3001) |
| `backend/src/app.js` | Express-приложение: CORS, `express.json()`, подключение роутов |

**Публичные маршруты (без авторизации):** `GET /health`, `GET /menu`, все `/orders/*`, `POST /admin/auth/login`.

**Защищённые маршруты:** всё, где стоит middleware `requireManager` — изменение меню, склад, сотрудники, аналитика, `/admin/auth/me` и `/logout`.

---

## Карта API (кратко)

| Префикс | Методы | Auth | Основная логика |
|---------|--------|------|-----------------|
| `/health` | GET | нет | Проверка, что сервер жив |
| `/menu` | GET | нет | Список меню + доступность по складу |
| `/menu` | POST, PATCH, DELETE | да | CRUD позиций меню |
| `/menu/:id/ingredients` | GET, PUT | да | Рецептура блюда |
| `/orders` | GET, POST, PATCH | нет | Заказы: список, создание, смена статуса |
| `/orders/:id/pay` | POST | нет | Оплата |
| `/orders/:id/close` | POST | нет | Закрытие по коду сотрудника |
| `/inventory` | GET, POST, PATCH, DELETE | да | Склад |
| `/inventory/movements` | GET | да | Журнал движений |
| `/employees` | GET, POST, PUT, DELETE | да | Сотрудники |
| `/analytics/orders` | GET | да | Статистика заказов |
| `/analytics/employees` | GET | да | Статистика сотрудников |
| `/admin/auth/login` | POST | нет | Вход в админку |
| `/admin/auth/me`, `/logout` | GET, POST | да | Сессия |

---

## Файлы backend — подробно

### `backend/server.js`

- Загружает переменные окружения (`dotenv`).
- Вызывает `initializeDatabase()` — создаёт таблицы, миграции, демо-данные.
- Только после успешной инициализации слушает порт.

**Проверок нет** — только старт приложения.

---

### `backend/src/app.js`

- **CORS:** разрешён origin из `FRONTEND_ORIGIN` (по умолчанию `http://localhost:5173`).
- **JSON body:** `express.json()` для всех POST/PATCH/PUT.
- Подключает роутеры: `/orders`, `/menu`, `/inventory`, `/employees`, `/analytics`, `/admin/auth`.

**Логики нет** — только конфигурация Express.

---

### `backend/src/middleware/requireManager.js`

**Назначение:** защита админских эндпоинтов.

**Проверки:**
1. Заголовок `Authorization: Bearer <token>` — если нет → `401 ADMIN_UNAUTHORIZED`.
2. Токен ищется в `adminAuthService.getManagerByToken` — если сессия протухла или сотрудник неактивен → `401`.
3. При успехе в `req.manager` и `req.managerToken` кладётся текущий пользователь.

**Где используется:** все POST/PATCH/DELETE/PUT в menu, inventory, employees, analytics; `/admin/auth/me`, `/admin/auth/logout`.

---

### `backend/src/utils/parseDateBounds.js`

**Назначение:** парсинг дат для аналитики и журнала склада.

| Функция | Когда | Проверки |
|---------|-------|----------|
| `parseDateRange(from, to)` | Аналитика — **оба параметра обязательны** | Пустые → ошибка; формат `YYYY-MM-DD` или ISO; `from <= to` |
| `parseOptionalDateBounds(from, to)` | Движения склада — даты необязательны | Каждая дата валидируется отдельно; если обе заданы — `from <= to` |

---

### `backend/src/data/database.js`

**Назначение:** единственная точка работы с SQLite.

**Экспорт:** `run`, `get`, `all`, `initializeDatabase`, `db`.

**При старте (`initializeDatabase`, один раз):**
1. `PRAGMA foreign_keys = ON`
2. `createTables()` — 8 таблиц (см. раздел выше)
3. `ensureOrdersSchema()` — миграции для старых БД (добавление колонок заказа, **удаление** `orders.name`)
4. `seedMenuIfNeeded()` — импорт из legacy `menuDB.json`, если меню пустое
5. `seedOrdersIfNeeded()` — импорт из legacy `db.json5`
6. `seedDemoDataIfNeeded()` — демо-ингредиенты, меню, сотрудники
7. `backfillMissingOrderNumbers()` — проставляет номера заказам без `order_number`

**CHECK-ограничения на уровне БД:**
- `inventory_items.item_type`: `ingredient` | `finished_good`
- `inventory_movements.movement_type`: `in` | `out`
- `employees.status`: `active` | `vacation` | `dismissed`
- `menu_ingredients.qty_per_unit > 0`

---

### `backend/src/data/seedDemoData.js`

**Назначение:** первичное наполнение пустой БД демо-данными (ключ `demo_seed_v1`).

**Что создаёт:** ингредиенты, 3 блюда (Капучино, Чизкейк, Мохито) с рецептами по объёмам, сотрудников.

**Проверки:** если seed уже выполнен или таблицы не пустые — пропускает.

---

## Routes (маршруты)

Routes **не содержат логики** — только связывают URL с controller и middleware.

| Файл | Эндпоинты |
|------|-----------|
| `routes/menuRoutes.js` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`, `GET/PUT /:id/ingredients` |
| `routes/orderRoutes.js` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/pay`, `POST /:id/close` |
| `routes/inventoryRoutes.js` | `GET /`, `POST /`, `PATCH /:id/restock`, `DELETE /:id`, `GET /movements` |
| `routes/employeesRoutes.js` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `routes/analyticsRoutes.js` | `GET /orders`, `GET /employees` |
| `routes/adminAuthRoutes.js` | `POST /login`, `GET /me`, `POST /logout` |

---

## Controllers (контроллеры)

Контроллеры проверяют **формат входа** и переводят ошибки сервиса в HTTP-статусы.

### `controllers/menuController.js`

| Метод | Проверки в controller | Сервис |
|-------|----------------------|--------|
| `getMenu` | нет | `menuService.getMenu` |
| `createMenuItem` | `name`, `category` — строки; если `isVolumes` → `price` объект, иначе число | `createMenuItem` |
| `updateMenuItem` | то же + `id` из URL | `updateMenuItem` → 404 если не найден |
| `deleteMenuItem` | только `id` | `deleteMenuItem` |
| `getMenuIngredients` | `id` | `getMenuIngredients` |
| `replaceMenuIngredients` | `ingredients` — массив | `replaceMenuIngredients` → 400 при неверном ингредиенте/qty |

---

### `controllers/ordersController.js`

| Метод | Проверки в controller | Особенности |
|-------|----------------------|-------------|
| `getOrders` | Собирает фильтры из query; **если нет date/from/to и нет `includeAll=true` → по умолчанию `date=today`** | `ordersService.getOrders` |
| `getOrderById` | `id` | |
| `createOrder` | `cart` — непустой массив | |
| `updateOrderStatus` | `status` — строка | |
| `payOrder` | `paymentMethod` — строка | |
| `closeOrder` | `employeeCode` — строка | |

Ошибки сервиса отдаются через `sendOrderError` с полем `code` (например `ORDER_STOCK_SHORTAGE`).

**Query-параметры `GET /orders`:**

| Параметр | Описание |
|----------|----------|
| `status` | `pending`, `ready`, `paid`, `closed` |
| `activeOnly=true` | Только не закрытые (`pending`, `ready`, `paid`) |
| `date` | `today` или `YYYY-MM-DD` |
| `from`, `to` | ISO-даты (диапазон по `created_at`) |
| `q` | Поиск по `order_number` (LIKE) |
| `includeAll=true` | Отключить фильтр «только сегодня» |

---

### `controllers/inventoryController.js`

| Метод | Проверки |
|-------|----------|
| `createInventoryItem` | `name` — строка; `itemType` только `ingredient` или `finished_good`; дубликат имени → 409 |
| `restockInventoryItem` | Ошибки qty → 400, не найден → 404 |
| `deleteInventoryItem` | не найден → 404 |
| `getInventoryMovements` | Фильтры передаются в сервис |

**Query `GET /inventory/movements`:** `itemId`, `from`, `to`, `movementType` (`in`/`out`), `referenceType`, `limit` (1–2000, по умолчанию 500).

---

### `controllers/employeesController.js`

| Метод | Проверки |
|-------|----------|
| `createEmployee`, `updateEmployee` | `fullName`, `position`, `personalCode` — непустые строки; `status` ∈ `active`, `vacation`, `dismissed`; уникальность `personal_code` → 409 |
| `deleteEmployee` | не найден → 404 |

---

### `controllers/analyticsController.js`

Проверок почти нет — query передаётся в сервис. Ошибки парсинга дат → 400.

**Query `GET /analytics/orders`:** `from`, `to` (обязательны), `groupBy` (`day`/`week`/`month`), `topLimit` (1–50).

**Query `GET /analytics/employees`:** `from`, `to`, `topLimit`.

---

### `controllers/adminAuthController.js`

| Метод | Логика |
|-------|--------|
| `login` | `loginManager(personalCode, password)` → `{ token, manager }` |
| `me` | Возвращает `req.manager` (уже проверен middleware) |
| `logout` | `clearSession(token)` → 204 |

---

## Services (основная бизнес-логика)

### `services/menuService.js`

**Главные операции:**

| Функция | Что делает |
|---------|------------|
| `getMenu` | SELECT всех позиций + для каждой считает **доступность по складу** |
| `createMenuItem` / `updateMenuItem` / `deleteMenuItem` | CRUD таблицы `menu` |
| `getMenuIngredients` | JOIN `menu_ingredients` + `inventory_items` |
| `replaceMenuIngredients` | **Транзакция:** DELETE старых строк рецепта → INSERT новых |

**Логика доступности (`getMenuItemAvailability`):**
- Без объёмов: один запрос рецепта (`volume = null`).
- С объёмами: для каждого ключа из `price_json` проверяет остатки.
- SQL `RECIPE_STOCK_SQL`: рецепт для конкретного объёма **или** общий (`volume IS NULL`), если для этого ингредиента нет отдельной строки на объём.
- Если `currentQty < qty_per_unit` → позиция/объём недоступен, формируется `stockMessage`.

**Проверки в `replaceMenuIngredients`:**
- Блюдо существует
- Каждый `inventoryItemId` есть в БД
- `qtyPerUnit > 0`
- При ошибке — `ROLLBACK`

---

### `services/ordersService.js`

**Статусы и переходы:**

```
pending → ready → paid → closed
```

Функция `isStatusTransitionAllowed` — только соседние шаги вперёд (или тот же статус).

**Главные операции:**

| Функция | Логика |
|---------|--------|
| `getOrders` | Динамический SQL с фильтрами (см. controller); сортировка: сначала по статусу (pending первым), потом по дате ↓ |
| `createOrder` | **Транзакция:** INSERT заказ + items + **списание склада** + записи в `inventory_movements` |
| `updateOrderStatus` | Проверка допустимого перехода |
| `payOrder` | Только из `ready`; методы: `cash`, `card`, `other` |
| `closeOrderWithEmployeeCode` | Только из `paid`; проверка кода сотрудника |

**Проверки при создании заказа (`normalizeCartItem`):**
- Каждый элемент — объект с `name`, `price > 0`
- `id` (menu_id) — опционально, но если есть — целое > 0
- `volume` — опционально, если есть — положительное число

**Списание склада при `createOrder`:**
- Для каждой позиции с `menu_id` — тот же SQL рецепта, что в menuService
- Нехватка → `ORDER_STOCK_SHORTAGE`, откат всей транзакции
- Движение: `movement_type=out`, `reason=order`, `reference_type=order`, `reference_id=orderId`

**Генерация номера заказа:** формат `YYYYMMDD-0001`, счётчик сбрасывается каждый день.

**Проверки при закрытии заказа:**
- `employeeCode`: длина 3–32, символы `[A-Za-z0-9_-]`
- Сотрудник `active`
- Должность: `barista`, `manager`, `бариста`, `менеджер`

---

### `services/inventoryService.js`

| Функция | Логика |
|---------|--------|
| `getInventoryItems` | JOIN `inventory_items` + `inventory_stock`, сортировка по имени |
| `createInventoryItem` | INSERT item + stock; при qty > 0 — движение `initial_stock` |
| `restockInventoryItem` | `quantity > 0`, UPDATE stock, движение `in` |
| `deleteInventoryItem` | CASCADE удалит stock и movements |
| `getInventoryMovements` | Фильтры + LIMIT, сортировка по дате ↓ |

**Проверки:** qty положительное; `movementType` только `in`/`out`; `itemId` — число.

---

### `services/employeesService.js`

Простой CRUD без дополнительной бизнес-логики. Проверка «существует ли сотрудник» — только в update/delete.

---

### `services/analyticsService.js`

**`getOrdersAnalytics(from, to, groupBy?, topLimit?)` возвращает:**
- `summary` — кол-во заказов, выручка, средний чек за период
- `topProducts` — топ блюд по строкам заказа
- `salesByHour` — 24 корзины по часам + `peakHour`
- `buckets` — если передан `groupBy`: разбивка по day/week/month

**`getEmployeesAnalytics` возвращает:**
- `summary` — закрытые заказы за период
- `topEmployees` — кто больше закрыл чеков (только `status=closed`)

**Проверки:** `groupBy` ∈ day/week/month; `topLimit` 1–50.

---

### `services/adminAuthService.js`

**Два способа входа:**

1. **Владелец** — `ADMIN_OWNER_LOGIN` + `ADMIN_OWNER_PASSWORD` из `.env`; сессия `isOwner: true`, id=0.
2. **Менеджер из БД** — `personal_code` + общий пароль `ADMIN_PASSWORD`; должность `manager`/`менеджер`, статус `active`.

**Сессии:** in-memory `Map`, TTL 12 часов, токен 64 hex-символа.

**Проверки при логине:**
- personalCode и password не пустые
- Для менеджера: `ADMIN_PASSWORD` должен быть задан в env
- Неверные credentials → 401; неактивный / не менеджер → 403

**`getManagerByToken`:** при каждом запросе перепроверяет, что сотрудник ещё active и имеет доступ к админке.

---

## Где что происходит — шпаргалка

| Задача | Файл с логикой |
|--------|----------------|
| Доступность блюда на витрине | `menuService.getMenuItemAvailability` |
| Списание ингредиентов | `ordersService.createOrder` |
| Жизненный цикл заказа | `ordersService` (статусы, pay, close) |
| Рецептура | `menuService.replaceMenuIngredients` |
| Фильтр заказов «сегодня» | `ordersController.getOrders` + `ordersService.getOrders` |
| Журнал склада | `inventoryService.getInventoryMovements` |
| Статистика | `analyticsService` |
| Авторизация админки | `adminAuthService` + `requireManager` |
| Схема БД и миграции | `database.js` |

---

## Переменные окружения (`.env`)

| Переменная | Назначение |
|------------|------------|
| `PORT` | Порт сервера (default 3001) |
| `FRONTEND_ORIGIN` | CORS origin для React |
| `ADMIN_PASSWORD` | Общий пароль для входа менеджеров по personal_code |
| `ADMIN_OWNER_LOGIN` | Логин владельца (опционально) |
| `ADMIN_OWNER_PASSWORD` | Пароль владельца |
| `ADMIN_OWNER_NAME` | Отображаемое имя владельца |
