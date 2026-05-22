# Управление кафе: что реализовано на сервере

Документ описывает **серверную часть** (`backend/`) системы управления кафе и, отдельно, **фронтенд** (`varka-react/`) как способ проверить этот функционал вручную.

Базовый URL API: `http://localhost:3001` (см. `varka-react/src/constants/api.js`).

---

## 1. Общая архитектура

| Слой | Путь | Назначение |
|------|------|------------|
| Точка входа | `backend/src/app.js` | Express, CORS, маршруты |
| БД | `backend/src/data/database.js` | SQLite (`cafe.sqlite`), создание таблиц, миграции колонок |
| Сервисы | `backend/src/services/*` | Бизнес-логика |
| Контроллеры | `backend/src/controllers/*` | HTTP-валидация и ответы |
| Middleware | `backend/src/middleware/requireManager.js` | Проверка сессии менеджера |

**Разделение доступа:**

- **Публичные (POS / бариста)** — заказы и чтение меню без авторизации.
- **Только менеджер** — изменение меню, склад, рецепты, сотрудники, аналитика; вход через `Authorization: Bearer <token>`.

---

## 2. База данных (SQLite)

При старте вызывается `initializeDatabase()`: создаются таблицы, дозаполняются legacy-данные, для старых заказов генерируются `order_number`.

### Таблицы

| Таблица | Назначение |
|---------|------------|
| `menu` | Позиции меню (название, категория, объёмы, цены в JSON) |
| `menu_ingredients` | Рецепт: связь позиции меню ↔ ингредиент склада, количество на порцию |
| `inventory_items` | Складские позиции (`ingredient` / `finished_good`) |
| `inventory_stock` | Остаток по каждой позиции |
| `inventory_movements` | Движения (`in` / `out`), привязка к заказу через `reference_id` |
| `orders` | Заказы: статус, оплата, кто закрыл чек |
| `order_items` | Позиции заказа (снимок названия и цены) |
| `employees` | Сотрудники: ФИО, должность, статус, персональный код |

### Заказы — ключевые поля

| Поле | Описание |
|------|----------|
| `id` | Внутренний UUID (для API `.../orders/:id`) |
| `order_number` | Человекочитаемый номер: `YYYYMMDD-####`, уникальный |
| `status` | `pending` → `ready` → `paid` → `closed` |
| `payment_method`, `paid_at` | Эмуляция оплаты (`cash`, `card`, `other`) |
| `closed_by_employee_id`, `closed_at` | Кто и когда закрыл чек |

Индексы: `order_number` (unique), `created_at`, `status`.

### Сотрудники

- `position`: должность (для админки важны `manager` / `менеджер`).
- `status`: `active`, `vacation`, `dismissed`.
- `personal_code`: уникальный код (используется при входе менеджера и при закрытии чека на POS).

---

## 3. Авторизация менеджера

**Файлы:** `adminAuthService.js`, `adminAuthController.js`, `adminAuthRoutes.js`, `requireManager.js`.

### Модель

- Пароль **не в БД** — общий `ADMIN_PASSWORD` из `backend/.env`.
- Вход: `personalCode` активного сотрудника с должностью `manager` или `менеджер`.
- Сессия **в памяти процесса** (Map): случайный token, TTL 12 часов.
- Клиент шлёт: `Authorization: Bearer <token>`.

### Эндпоинты `/admin/auth`

| Метод | Путь | Доступ | Действие |
|-------|------|--------|----------|
| `POST` | `/admin/auth/login` | Публичный | Логин, выдача `{ token, manager }` |
| `GET` | `/admin/auth/me` | `requireManager` | Текущий менеджер |
| `POST` | `/admin/auth/logout` | `requireManager` | Удаление сессии |

### Коды ошибок

| HTTP | Когда |
|------|-------|
| `401` | Нет / неверный / истёкший token |
| `403` | Не менеджер, неактивный сотрудник |
| `400` | Не переданы `personalCode` / `password` |

---

## 4. API заказов (POS) — публичные

**Файлы:** `orderRoutes.js`, `ordersController.js`, `ordersService.js`.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/orders` | Список с фильтрами (см. ниже) |
| `GET` | `/orders/:id` | Один заказ с позициями |
| `POST` | `/orders` | Создание заказа из корзины |
| `PATCH` | `/orders/:id` | Смена статуса (например `ready`) |
| `POST` | `/orders/:id/pay` | Оплата: `{ "paymentMethod": "cash" \| "card" \| "other" }` |
| `POST` | `/orders/:id/close` | Закрытие чека: `{ "employeeCode": "..." }` |

### Жизненный цикл статусов

```
pending → ready → paid → closed
```

- Оплата только из `ready`.
- Закрытие только из `paid`.
- Повторная оплата / закрытие → `409` с кодом `ORDER_ALREADY_PAID` / `ORDER_ALREADY_CLOSED`.

### Создание заказа (`POST /orders`)

- Тело: `{ "name"?: string, "cart": [...] }` — имя клиента **не обязательно**.
- Генерируется `id` (UUID) и `order_number` в одной транзакции.
- Валидируется каждая позиция: `name`, `price > 0`, опционально `id` (menu), `volume`.
- **Списание склада** по рецепту (`menu_ingredients`) происходит **только при создании**, не при оплате.
- При нехватке ингредиента — откат транзакции, ошибка `ORDER_STOCK_SHORTAGE`.

### Закрытие чека

- Код сотрудника: 3–32 символа, `[A-Za-z0-9_-]`.
- Сотрудник: `status = active`, должность `barista`, `manager`, `бариста` или `менеджер`.
- В ответе: `closedByEmployee: { id, fullName }`.

### Фильтры `GET /orders`

| Query | Описание |
|-------|----------|
| `status` | `pending`, `ready`, `paid`, `closed` |
| `activeOnly=true` | Без `closed` |
| `date` | `today` или `YYYY-MM-DD` |
| `from`, `to` | ISO-диапазон по `created_at` |
| `q` | Поиск по `order_number` (LIKE) |
| `includeAll=true` | Без ограничения «только сегодня» |

**По умолчанию** (для POS): заказы **за сегодня**, сортировка — активные статусы выше, внутри статуса новые первыми.

Ошибки API: `{ "error": "...", "code": "ORDER_..." }`.

---

## 5. API меню

**Файлы:** `menuRoutes.js`, `menuController.js`, `menuService.js`.

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| `GET` | `/menu` | Публичный | Весь каталог |
| `GET` | `/menu/:id/ingredients` | Менеджер | Рецепт позиции |
| `POST` | `/menu` | Менеджер | Создание позиции |
| `PATCH` | `/menu/:id` | Менеджер | Редактирование |
| `DELETE` | `/menu/:id` | Менеджер | Удаление |
| `PUT` | `/menu/:id/ingredients` | Менеджер | Замена рецепта (массив `ingredients`) |

Позиция может быть с одной ценой (`number`) или с объёмами (`isVolumes: true`, `price` — объект).

---

## 6. API склада

**Файлы:** `inventoryRoutes.js`, `inventoryController.js`, `inventoryService.js`.

Все маршруты — **только менеджер**.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/inventory` | Список позиций с остатками |
| `GET` | `/inventory/movements` | История движений (фильтры: `itemId`, `from`, `to`, `movementType`, `referenceType`, `limit`) |
| `POST` | `/inventory` | Создание позиции + начальный остаток |
| `PATCH` | `/inventory/:id/restock` | Пополнение: `{ quantity, reason? }` |
| `DELETE` | `/inventory/:id` | Удаление позиции |

Типы: `ingredient`, `finished_good`. Единица измерения по умолчанию `pcs`.

---

## 7. API сотрудников

**Файлы:** `employeesRoutes.js`, `employeesController.js`, `employeesService.js`.

Все маршруты — **только менеджер**.

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/employees` | Список |
| `POST` | `/employees` | Создание |
| `PUT` | `/employees/:id` | Обновление |
| `DELETE` | `/employees/:id` | Удаление |

Поля: `fullName`, `position`, `status` (`active` \| `vacation` \| `dismissed`), `personalCode` (уникальный).

---

## 8. API аналитики

**Файлы:** `analyticsRoutes.js`, `analyticsService.js`.

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| `GET` | `/analytics/orders` | Менеджер | Сводка, топ товаров, пик по часам, разбивка по периодам |
| `GET` | `/analytics/employees` | Менеджер | Топ сотрудников по закрытым чекам за период |

Query: `from`, `to` (обязательны, парсятся в ISO), `groupBy` — `day` \| `week` \| `month` (опционально), `topLimit` — топ товаров (по умолчанию 10, макс. 50).

Ответ:

```json
{
  "from": "...",
  "to": "...",
  "summary": { "totalRevenue", "orderCount", "averageCheck" },
  "topProducts": [{ "rank", "menuId", "name", "orderCount", "revenue" }],
  "salesByHour": [{ "hour", "label", "orderCount" }],
  "peakHour": { "hour", "label", "orderCount" },
  "groupBy": "day",
  "buckets": [{ "period", "orderCount", "revenue", "averageCheck" }]
}
```

- **topProducts** — популярность по числу строк в `order_items` (повтор одного товара в корзине = несколько единиц).
- **salesByHour** / **peakHour** — распределение заказов по часу создания (`localtime`), пик — час с максимумом заказов.

---

## 9. Служебный эндпоинт

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/health` | `{ "ok": true }` — проверка, что сервер запущен |

---

## 10. Фронтенд как проверка сервера

Фронт **не является** основной системой управления — это UI для ручной проверки API. Базовый URL тот же: `http://localhost:3001`.

### 10.1. POS (бариста) — без авторизации

| Страница | Маршрут | Какие API проверяет |
|----------|---------|---------------------|
| Главная / оформление | `/` (`HomePage.jsx`) | `GET /menu`, `POST /orders` |
| Список заказов | `/orders` (`OrdersPage.jsx`) | `GET /orders` (фильтры, дата, поиск), `PATCH /orders/:id` (готово) |
| Детали заказа | модалка (`OrderDetailsModal.jsx`) | `GET /orders/:id`, `POST .../pay`, `POST .../close` |

**Сценарий проверки POS:**

1. Создать заказ с главной → в ответе `orderNumber`.
2. На `/orders` отметить «Готово» → статус `ready`.
3. В модалке оплатить (`cash` / `card` / `other`) → `paid`.
4. Ввести код активного бариста → `closed`, в ответе `closedByEmployee`.

### 10.2. Админка (менеджер) — с Bearer token

| Страница | Маршрут | API |
|----------|---------|-----|
| Вход | `/admin/login` | `POST /admin/auth/login` |
| Контекст сессии | `AdminAuthContext` | `GET /admin/auth/me`, `POST /admin/auth/logout` |
| Дашборд | `/admin` | Навигация (без отдельного API) |
| Меню | `/admin/menu` | `GET/POST/PATCH/DELETE /menu` |
| Рецепты | `/admin/recipes` | `GET /menu`, `GET /inventory`, `GET/PUT /menu/:id/ingredients` |
| Склад | `/admin/inventory` | `GET/POST /inventory`, `PATCH .../restock`, `DELETE`, `GET /inventory/movements` |
| Сотрудники | `/admin/employees` | CRUD `/employees` |
| Статистика | `/admin/stats` | `GET /analytics/orders` |

Общий клиент: `adminFetch()` в `varka-react/src/utils/adminApi.js` — подставляет `Authorization: Bearer` из `localStorage` (`adminToken`); при `401` на `/admin/*` — сброс и редирект на логин.

Защита маршрутов: `ProtectedAdminRoute` + `AdminAuthProvider` в `main.jsx`.

**Сценарий проверки админки:**

1. В `.env` задать `ADMIN_PASSWORD`, в БД — активный менеджер с `personal_code`.
2. Войти на `/admin/login` → открываются разделы `/admin/*`.
3. Без token или с token баристы — `GET /menu` (публичный) работает, `GET /employees` → `401`.
4. После «Выйти» — admin API снова `401`.

### 10.3. Что на фронте ещё не доведено (не блокирует сервер)

- Старый `AdminUnlockModal` с «ключом на фронте» — не основная авторизация.
- Нет автообновления списка заказов каждые 10–15 с.
- Внутренний `id` заказа иногда виден в UI (на сервере он нужен для запросов).

Подробный чеклист задач: `TODO-POS-ADMIN.md`.

---

## 11. Переменные окружения (backend)

| Переменная | Назначение |
|------------|------------|
| `ADMIN_PASSWORD` | Пароль входа в админку (обязателен для login) |
| `FRONTEND_ORIGIN` | CORS (по умолчанию `http://localhost:5173`) |
| `PORT` | Порт сервера (если задан в точке запуска) |

---

## 12. Краткая карта «сервер → кто вызывает»

```
                    ┌─────────────────────────────────────┐
                    │           Express API               │
                    └─────────────────────────────────────┘
         публично                          requireManager
              │                                      │
    GET /menu, /orders*                   /inventory/*
    POST/PATCH /orders*                   /employees/*
                                          /menu (кроме GET)
                                          /analytics/*
                                          /admin/auth/me|logout
              │                                      │
         HomePage, OrdersPage                  admin/* pages
         OrderModal, OrderDetailsModal         adminFetch()
```

`*` — все операции с заказами для POS без токена.

---

*Документ актуален на момент реализации в ветке coursework-cafe-management. При добавлении API обновляйте этот файл или `TODO-POS-ADMIN.md`.*
