# Документация backend (coursework-cafe-management)

Сервер на **Node.js + Express**, БД — **SQLite** (`src/data/cafe.sqlite`).  
Базовый URL: `http://localhost:3001` (порт из `PORT` в `.env`).

---

## 1. Архитектура слоёв

```
HTTP-запрос
    → routes/        маршруты, привязка URL → handler, middleware
    → controllers/   валидация тела/query, коды ответов HTTP
    → services/      бизнес-логика, SQL, транзакции
    → data/database  подключение SQLite, создание таблиц, seed
```

| Слой | Задача |
|------|--------|
| **routes** | Какой URL и метод, нужен ли `requireManager` |
| **controllers** | Проверить входные данные, вызвать service, вернуть JSON/статус |
| **services** | Правила предметной области, работа с БД |
| **middleware** | Сквозная логика (авторизация менеджера) |
| **data / utils** | Инфраструктура |

**Доступ:**

- **Публично (POS / бариста):** `GET /menu`, все `/orders/*`
- **Только менеджер:** заголовок `Authorization: Bearer <token>` после `POST /admin/auth/login`

---

## 2. Точка входа и приложение

### `server.js`

| Что делает |
|------------|
| Загружает `.env` (`dotenv`) |
| Вызывает `initializeDatabase()` — таблицы, миграции, demo-seed |
| Запускает Express на `PORT` (по умолчанию 3001) |

### `src/app.js`

| Что делает |
|------------|
| Создаёт Express-приложение |
| CORS на `FRONTEND_ORIGIN` (по умолчанию `http://localhost:5173`) |
| `express.json()` — парсинг JSON-тела |
| `GET /health` → `{ ok: true }` |
| Подключает роутеры: `/orders`, `/menu`, `/inventory`, `/employees`, `/analytics`, `/admin/auth` |

### `package.json`

- `npm start` → `node server.js`

### `env.example` / `.env`

| Переменная | Назначение |
|------------|------------|
| `PORT` | Порт сервера |
| `ADMIN_PASSWORD` | Общий пароль входа менеджера из БД |
| `ADMIN_OWNER_LOGIN` | Логин владельца (не в таблице `employees`) |
| `ADMIN_OWNER_PASSWORD` | Пароль владельца |
| `ADMIN_OWNER_NAME` | Отображаемое имя владельца |

---

## 3. База данных и инфраструктура

### `src/data/database.js`

**Экспорт:** `db`, `run`, `get`, `all`, `initializeDatabase`

| Функция / блок | Назначение |
|----------------|------------|
| `run(sql, params)` | INSERT/UPDATE/DELETE, Promise |
| `get(sql, params)` | Одна строка |
| `all(sql, params)` | Массив строк |
| `createTables()` | Создание таблиц, если нет |
| `ensureOrdersSchema()` | Дозаполнение колонок `orders` для старых БД |
| `seedMenuIfNeeded()` | Меню из legacy `menuDB.json`, если меню пустое |
| `seedOrdersIfNeeded()` | Заказы из legacy `db.json5`, если заказов нет |
| `seedDemoDataIfNeeded()` | Демо-данные (см. `seedDemoData.js`), один раз |
| `backfillMissingOrderNumbers()` | Генерация `order_number` для старых заказов |
| `initializeDatabase()` | Всё выше при первом обращении к БД |

**Таблицы:**

| Таблица | Назначение |
|---------|------------|
| `menu` | Позиции меню, цены в `price_json` |
| `menu_ingredients` | Рецепт: меню ↔ склад, `qty_per_unit`, опционально `volume` |
| `inventory_items` | Склад: `ingredient` / `finished_good` |
| `inventory_stock` | Остаток по позиции |
| `inventory_movements` | Приход/расход (`in` / `out`) |
| `orders` | Заказ: статус, оплата, кто закрыл |
| `order_items` | Строки заказа (снимок имени и цены) |
| `employees` | Сотрудники, `personal_code` |
| `app_meta` | Флаги (например `demo_seed_v1`) |

### `src/data/seedDemoData.js`

| Функция | Назначение |
|---------|------------|
| `seedDemoDataIfNeeded({ run, get })` | Один раз заполняет ингредиенты, меню, рецепты, демо-заказы |
| `upsertInventoryItem` | Складская позиция по имени (без дублей) |
| `upsertMenuItem` | Позиция меню по имени |
| `ensureMenuRecipes` | Рецепты, если у позиции ещё нет |
| `seedDemoOrders` | 4 заказа в разных статусах |

### `src/utils/parseDateBounds.js`

| Функция | Назначение |
|---------|------------|
| `parseDateRange(from, to)` | Обязательный период для аналитики → `fromIso`, `toIso` |
| `parseOptionalDateBounds(from, to)` | Необязательные границы (движения склада) |
| `DATE_ONLY` | Regex `YYYY-MM-DD` |

---

## 4. Middleware (общий)

### `src/middleware/requireManager.js`

| Функция | Назначение |
|---------|------------|
| `extractBearerToken(authHeader)` | Достаёт token из `Authorization: Bearer ...` |
| `requireManager(req, res, next)` | Проверяет сессию, кладёт `req.manager` и `req.managerToken` |

**Ответы:** `401` — нет/неверный token; `500` — ошибка проверки.

Используется на: меню (кроме GET `/`), склад, сотрудники, аналитика, `GET /admin/auth/me`, `POST /admin/auth/logout`.

---

## 5. Admin Auth — вход в админку

**Префикс API:** `/admin/auth`

### Routes — `src/routes/adminAuthRoutes.js`

| Метод | Путь | Middleware | Controller |
|-------|------|------------|------------|
| POST | `/login` | — | `login` |
| GET | `/me` | `requireManager` | `me` |
| POST | `/logout` | `requireManager` | `logout` |

### Controller — `src/controllers/adminAuthController.js`

| Функция | Назначение |
|---------|------------|
| `login` | Тело: `{ personalCode, password }` → `{ token, manager }` |
| `me` | Текущий менеджер из `req.manager` |
| `logout` | Удаляет сессию, `204` |
| `sendAuthError` | Единый формат ошибки с `code` |

### Service — `src/services/adminAuthService.js`

| Функция / сущность | Назначение |
|---------------------|------------|
| `AdminAuthError` | Ошибка с `statusCode` и `code` |
| `loginManager(personalCode, password)` | Владелец из `.env` или менеджер из БД + `ADMIN_PASSWORD` |
| `getManagerByToken(token)` | Восстановление сессии (владелец / сотрудник) |
| `clearSession(token)` | Logout |
| `createSession` | Token в памяти (Map), TTL 12 ч |
| `isOwnerCredentials` | Проверка `ADMIN_OWNER_*` |
| `getManagerByPersonalCode` | Менеджер по `personal_code`, активный, должность manager |
| `mapOwner` / `mapManager` | DTO для ответа API |

**Сессии хранятся в памяти процесса** (не в БД).

---

## 6. Menu — меню и рецепты

**Префикс API:** `/menu`

### Routes — `src/routes/menuRoutes.js`

| Метод | Путь | Доступ | Controller |
|-------|------|--------|------------|
| GET | `/` | Публичный | `getMenu` |
| GET | `/:id/ingredients` | Менеджер | `getMenuIngredients` |
| POST | `/` | Менеджер | `createMenuItem` |
| PATCH | `/:id` | Менеджер | `updateMenuItem` |
| DELETE | `/:id` | Менеджер | `deleteMenuItem` |
| PUT | `/:id/ingredients` | Менеджер | `replaceMenuIngredients` |

### Controller — `src/controllers/menuController.js`

| Функция | Назначение |
|---------|------------|
| `getMenu` | Список меню для POS |
| `createMenuItem` | Валидация `name`, `category`, `isVolumes`, `price` (число или объект объёмов) |
| `updateMenuItem` | То же для PATCH |
| `deleteMenuItem` | Удаление позиции |
| `getMenuIngredients` | Рецепт позиции |
| `replaceMenuIngredients` | Тело: `{ ingredients: [{ inventoryItemId, qtyPerUnit, volume? }] }` — полная замена рецепта |

### Service — `src/services/menuService.js`

| Функция | Назначение |
|---------|------------|
| `getMenu()` | Все позиции, `price_json` → объект `price` |
| `createMenuItem(itemData)` | INSERT в `menu` |
| `updateMenuItem(id, itemData)` | UPDATE |
| `deleteMenuItem(id)` | DELETE (каскад рецептов) |
| `getMenuIngredients(menuId)` | JOIN с `inventory_items` |
| `replaceMenuIngredients(menuId, ingredients)` | Транзакция: DELETE старых + INSERT новых в `menu_ingredients` |

**Связь со складом:** рецепт в `menu_ingredients`; при создании заказа склад списывается в `ordersService`.

---

## 7. Orders — заказы (POS)

**Префикс API:** `/orders`  
**Все маршруты публичные** (без `requireManager`).

### Routes — `src/routes/orderRoutes.js`

| Метод | Путь | Controller |
|-------|------|------------|
| GET | `/` | `getOrders` |
| GET | `/:id` | `getOrderById` |
| POST | `/` | `createOrder` |
| PATCH | `/:id` | `updateOrderStatus` |
| POST | `/:id/pay` | `payOrder` |
| POST | `/:id/close` | `closeOrder` |

### Controller — `src/controllers/ordersController.js`

| Функция | Назначение |
|---------|------------|
| `getOrders` | Query: `status`, `activeOnly`, `date`, `from`, `to`, `q`, `includeAll`. По умолчанию — заказы за **сегодня** |
| `getOrderById` | Один заказ с `items` |
| `createOrder` | Тело: `{ name?, cart: [...] }`, корзина не пустая |
| `updateOrderStatus` | Тело: `{ status }` |
| `payOrder` | Тело: `{ paymentMethod: cash\|card\|other }` |
| `closeOrder` | Тело: `{ employeeCode }` — код бариста/менеджера |
| `sendOrderError` | Ответ `{ error, code }` с `statusCode` из service |

### Service — `src/services/ordersService.js`

| Функция / константа | Назначение |
|---------------------|------------|
| `ORDER_STATUSES` | `pending` → `ready` → `paid` → `closed` |
| `OrderServiceError` | Бизнес-ошибки с кодами `ORDER_*` |
| `getOrders(filters)` | Список с фильтрами и сортировкой |
| `getOrderById(id)` | Заказ + позиции + `closedByEmployee` |
| `createOrder(name, cart)` | UUID, `order_number`, INSERT items, **списание склада** по рецепту |
| `updateOrderStatus(id, status)` | Проверка допустимых переходов |
| `payOrder(id, paymentMethod)` | Только из `ready` |
| `closeOrderWithEmployeeCode(id, employeeCode)` | Только из `paid`, проверка сотрудника и должности |
| `generateNextOrderNumber` | Формат `YYYYMMDD-####` |
| `normalizeCartItem` | Валидация позиции корзины |
| `expandOrder` | Добавляет массив `items` к заказу |

**Важно:** списание ингредиентов происходит при **создании** заказа, не при оплате.

---

## 8. Inventory — склад

**Префикс API:** `/inventory`  
**Все маршруты** — только менеджер.

### Routes — `src/routes/inventoryRoutes.js`

| Метод | Путь | Controller |
|-------|------|------------|
| GET | `/` | `getInventoryItems` |
| GET | `/movements` | `getInventoryMovements` |
| POST | `/` | `createInventoryItem` |
| PATCH | `/:id/restock` | `restockInventoryItem` |
| DELETE | `/:id` | `deleteInventoryItem` |

### Controller — `src/controllers/inventoryController.js`

| Функция | Назначение |
|---------|------------|
| `getInventoryItems` | Список с остатками |
| `createInventoryItem` | `name`, `itemType` (`ingredient` \| `finished_good`), `unit`, `quantity` |
| `restockInventoryItem` | Приход на склад |
| `deleteInventoryItem` | Удаление позиции |
| `getInventoryMovements` | История: query `itemId`, `from`, `to`, `movementType`, `referenceType`, `limit` |

### Service — `src/services/inventoryService.js`

| Функция | Назначение |
|---------|------------|
| `getInventoryItems()` | JOIN `inventory_items` + `inventory_stock` |
| `createInventoryItem({ name, itemType, unit, quantity })` | Позиция + начальный остаток + движение `in` |
| `restockInventoryItem(id, quantity, reason)` | Увеличение остатка + движение |
| `deleteInventoryItem(id)` | DELETE (каскад stock/movements) |
| `getInventoryMovements(filters)` | Журнал с фильтрами, лимит до 2000 |
| `mapInventoryRow` | DTO для API |

---

## 9. Employees — сотрудники

**Префикс API:** `/employees`  
**Все маршруты** — только менеджер.

### Routes — `src/routes/employeesRoutes.js`

| Метод | Путь | Controller |
|-------|------|------------|
| GET | `/` | `getEmployees` |
| POST | `/` | `createEmployee` |
| PUT | `/:id` | `updateEmployee` |
| DELETE | `/:id` | `deleteEmployee` |

### Controller — `src/controllers/employeesController.js`

| Функция | Назначение |
|---------|------------|
| `getEmployees` | Список |
| `createEmployee` | `fullName`, `position`, `status`, `personalCode` |
| `updateEmployee` | Полное обновление записи |
| `deleteEmployee` | Удаление |

`status`: `active` | `vacation` | `dismissed`

### Service — `src/services/employeesService.js`

| Функция | Назначение |
|---------|------------|
| `getEmployees()` | SELECT всех, сортировка по id |
| `createEmployee(...)` | INSERT |
| `updateEmployee(id, ...)` | UPDATE + `updated_at` |
| `deleteEmployee(id)` | DELETE |
| `mapEmployeeRow` | snake_case → camelCase для API |

**Связь с заказами:** `personal_code` используется при `POST /orders/:id/close` и при входе менеджера (`manager` / `менеджер`).

---

## 10. Analytics — статистика

**Префикс API:** `/analytics`  
**Все маршруты** — только менеджер.

### Routes — `src/routes/analyticsRoutes.js`

| Метод | Путь | Controller |
|-------|------|------------|
| GET | `/orders` | `getOrdersAnalytics` |
| GET | `/employees` | `getEmployeesAnalytics` |

### Controller — `src/controllers/analyticsController.js`

| Функция | Назначение |
|---------|------------|
| `getOrdersAnalytics` | Query: `from`, `to`, `groupBy?` (`day`/`week`/`month`), `topLimit?` |
| `getEmployeesAnalytics` | Query: `from`, `to`, `topLimit?` |

### Service — `src/services/analyticsService.js`

#### Заказы и продажи (`getOrdersAnalytics`)

| Функция | Назначение |
|---------|------------|
| `getOrdersSummary` | Заказов, выручка, средний чек за период (`created_at`) |
| `getOrdersPeriods` | Разбивка по day/week/month |
| `getTopProducts` | Топ позиций по `order_items` |
| `getSalesByHour` | Заказы по часам (localtime), `peakHour` |
| `getOrdersAnalytics` | Собирает summary + topProducts + salesByHour + buckets |

#### Сотрудники (`getEmployeesAnalytics`)

| Функция | Назначение |
|---------|------------|
| `getClosedOrdersSummary` | Закрытые чеки за период (по `closed_at`) |
| `getTopEmployeesByClosedChecks` | Топ по числу закрытых чеков и сумме |
| `getEmployeesAnalytics` | summary + topEmployees |

Вспомогательные: `assertGroupBy`, `parseTopLimit`, `formatHourRange`.

---

## 11. Сводная таблица файлов по доменам

| Домен | routes | controller | service | middleware |
|-------|--------|------------|---------|------------|
| **Admin Auth** | `adminAuthRoutes.js` | `adminAuthController.js` | `adminAuthService.js` | `requireManager` (me, logout) |
| **Menu** | `menuRoutes.js` | `menuController.js` | `menuService.js` | `requireManager` (кроме GET `/`) |
| **Orders** | `orderRoutes.js` | `ordersController.js` | `ordersService.js` | — |
| **Inventory** | `inventoryRoutes.js` | `inventoryController.js` | `inventoryService.js` | `requireManager` |
| **Employees** | `employeesRoutes.js` | `employeesController.js` | `employeesService.js` | `requireManager` |
| **Analytics** | `analyticsRoutes.js` | `analyticsController.js` | `analyticsService.js` | `requireManager` |

**Общие:** `app.js`, `server.js`, `database.js`, `seedDemoData.js`, `parseDateBounds.js`, `requireManager.js`

---

## 12. Жизненный цикл заказа (связь модулей)

```
POS: POST /orders (cart)
  → ordersService.createOrder
  → menu_ingredients + inventory_stock (списание)
  → inventory_movements (out, reference order)

PATCH /orders/:id { status: ready }
POST /orders/:id/pay
POST /orders/:id/close { employeeCode }
  → employees (проверка кода)
  → orders.closed_by_employee_id

Админка: GET /analytics/orders, GET /analytics/employees
```

---

## 13. Перезапуск и демо-данные

- После изменения кода backend нужно **полностью перезапустить** процесс (`npm start`), иначе на порту может остаться старая версия в памяти.
- Демо-seed срабатывает один раз (флаг `demo_seed_v1` в `app_meta`).
- Сброс демо: удалить `cafe.sqlite` или `DELETE FROM app_meta WHERE key = 'demo_seed_v1'`.

---

*Документ описывает состояние backend на момент курсового проекта «управление кафе». Для обзора API и фронта см. также `SERVER-CAFE-MANAGEMENT.md` в корне репозитория.*
