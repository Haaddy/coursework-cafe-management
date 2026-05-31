import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSectionHeader from "./AdminSectionHeader";
import { adminFetch } from "../../utils/adminApi";

function formatLocalYmd(date) { // ! дата в формате YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() { // ! диапазон дат по умолчанию (текущий месяц)
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: formatLocalYmd(from), to: formatLocalYmd(to) };
}

const moneyFormatter = new Intl.NumberFormat("ru-BY", {
  style: "currency",
  currency: "BYN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(value) { // ! формат суммы в BYN
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return moneyFormatter.format(value);
}

const STATUS_OPTIONS = [
  { value: "active", label: "Работает" },
  { value: "vacation", label: "В отпуске" },
  { value: "dismissed", label: "Уволен" },
];

function AdminEmployeesPage() { // ! страница сотрудников и их статистики
  const [employees, setEmployees] = useState([]); // ! список сотрудников
  const [isLoading, setIsLoading] = useState(false); // ! загрузка / сохранение
  const [error, setError] = useState(""); // ! ошибка операции
  const [searchQuery, setSearchQuery] = useState(""); // ! поиск по сотрудникам

  const [fullName, setFullName] = useState(""); // ! ФИО нового сотрудника
  const [position, setPosition] = useState(""); // ! должность
  const [status, setStatus] = useState("active"); // ! статус
  const [personalCode, setPersonalCode] = useState(""); // ! личный код

  const [{ from: statsFrom, to: statsTo }, setStatsRange] = useState(defaultDateRange); // ! период статистики
  const [employeeStats, setEmployeeStats] = useState(null); // ! сводка по сотрудникам
  const [topEmployees, setTopEmployees] = useState(null); // ! топ сотрудников
  const [statsLoading, setStatsLoading] = useState(false); // ! загрузка статистики
  const [statsError, setStatsError] = useState(""); // ! ошибка статистики

  const loadEmployeeStats = useCallback(() => { // ! загрузка аналитики по сотрудникам
    if (!statsFrom || !statsTo) {
      setStatsError("Укажите даты «От» и «До»");
      return;
    }

    const params = new URLSearchParams({ from: statsFrom, to: statsTo });
    setStatsLoading(true);
    setStatsError("");

    adminFetch(`/analytics/employees?${params.toString()}`)
      .then((res) =>
        res.json().catch(() => ({})).then((data) => {
          if (!res.ok) {
            throw new Error(data.error || `Ошибка ${res.status}`);
          }
          return data;
        })
      )
      .then((data) => {
        setEmployeeStats(data.summary || null);
        setTopEmployees(Array.isArray(data.topEmployees) ? data.topEmployees : null);
      })
      .catch((err) => {
        setEmployeeStats(null);
        setTopEmployees(null);
        setStatsError(err.message || "Не удалось загрузить статистику");
      })
      .finally(() => setStatsLoading(false));
  }, [statsFrom, statsTo]);

  const loadEmployees = () => { // ! загрузка списка сотрудников
    setIsLoading(true);
    adminFetch("/employees")
      .then((res) =>
        res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data?.error || `Ошибка загрузки: ${res.status}`);
          }
          return data;
        })
      )
      .then((data) => {
        setEmployees(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => setError(err.message || "Ошибка сети"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { // ! загрузка сотрудников при монтировании
    loadEmployees();
  }, []);

  useEffect(() => { // ! перезагрузка статистики при смене периода
    loadEmployeeStats();
  }, [loadEmployeeStats]);

  const filteredEmployees = useMemo(() => { // ! отфильтрованный список сотрудников
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;

    return employees.filter((employee) => {
      const fullNameValue = String(employee.fullName || "").toLowerCase();
      const positionValue = String(employee.position || "").toLowerCase();
      const personalCodeValue = String(employee.personalCode || "").toLowerCase();
      return (
        fullNameValue.includes(q) ||
        positionValue.includes(q) ||
        personalCodeValue.includes(q)
      );
    });
  }, [employees, searchQuery]);

  const handleCreateEmployee = () => { // ! создание сотрудника
    const normalizedFullName = fullName.trim();
    const normalizedPosition = position.trim();
    const normalizedCode = personalCode.trim();

    if (!normalizedFullName) {
      setError("Введите имя сотрудника");
      return;
    }
    if (!normalizedPosition) {
      setError("Введите должность сотрудника");
      return;
    }
    if (!normalizedCode) {
      setError("Введите личный код сотрудника");
      return;
    }

    setIsLoading(true);
    setError("");
    adminFetch("/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: normalizedFullName,
        position: normalizedPosition,
        status,
        personalCode: normalizedCode,
      }),
    })
      .then((res) =>
        res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data?.error || `Ошибка создания: ${res.status}`);
          }
          return data;
        })
      )
      .then(() => {
        setFullName("");
        setPosition("");
        setStatus("active");
        setPersonalCode("");
        loadEmployees();
      })
      .catch((err) => {
        setError(err.message || "Ошибка сети");
        setIsLoading(false);
      });
  };

  const handleStatusChange = (employee, nextStatus) => { // ! смена статуса сотрудника
    if (employee.status === nextStatus) return;

    setIsLoading(true);
    setError("");
    adminFetch(`/employees/${employee.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: employee.fullName,
        position: employee.position,
        status: nextStatus,
        personalCode: employee.personalCode,
      }),
    })
      .then((res) =>
        res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data?.error || `Ошибка обновления: ${res.status}`);
          }
          return data;
        })
      )
      .then(() => loadEmployees())
      .catch((err) => {
        setError(err.message || "Ошибка сети");
        setIsLoading(false);
      });
  };

  const handleDeleteEmployee = (employee) => { // ! удаление сотрудника
    const isConfirmed = window.confirm(`Удалить сотрудника "${employee.fullName}"?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    setError("");
    adminFetch(`/employees/${employee.id}`, {
      method: "DELETE",
    })
      .then((res) =>
        res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data?.error || `Ошибка удаления: ${res.status}`);
          }
          return data;
        })
      )
      .then(() => loadEmployees())
      .catch((err) => {
        setError(err.message || "Ошибка сети");
        setIsLoading(false);
      });
  };

  return (
    <section className="admin-page admin-employees-page">
      <AdminSectionHeader
        title="Сотрудники"
        subtitle="Добавляйте сотрудников, меняйте их статус и управляйте составом команды."
        backTo="/admin"
      />

      <div className="card admin-employees-page__form">
        <h2 className="admin-card__title">Добавить сотрудника</h2>
        <div className="admin-employees-page__grid">
          <label className="admin-stats-page__filter">
            Имя сотрудника
            <input
              className="admin-input"
              type="text"
              placeholder="Например, Иван Петров"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <label className="admin-stats-page__filter">
            Должность
            <input
              className="admin-input"
              type="text"
              placeholder="Например, Barista"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            />
          </label>

          <label className="admin-stats-page__filter">
            Статус
            <select
              className="admin-input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-stats-page__filter">
            Личный код
            <input
              className="admin-input"
              type="text"
              placeholder="Например, BR-1001"
              value={personalCode}
              onChange={(event) => setPersonalCode(event.target.value)}
            />
          </label>
        </div>

        <div className="admin-toolbar">
          <button
            className="button button--accent"
            type="button"
            onClick={handleCreateEmployee}
            disabled={isLoading}
          >
            Добавить сотрудника
          </button>
        </div>
      </div>

      <div className="card admin-employees-page__table-wrap">
        <div className="admin-employees-page__table-head">
          <h2 className="admin-card__title">Список сотрудников</h2>
          <input
            className="admin-input admin-employees-page__search"
            type="text"
            placeholder="Поиск по имени, должности или коду"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        {isLoading && <p>Загрузка...</p>}
        {error && <p>{error}</p>}

        <table className="admin-inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Сотрудник</th>
              <th>Должность</th>
              <th>Статус</th>
              <th>Код</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td>{employee.fullName}</td>
                <td>{employee.position}</td>
                <td>
                  <select
                    className="admin-input admin-employees-page__status-select"
                    value={employee.status}
                    onChange={(event) => handleStatusChange(employee, event.target.value)}
                    disabled={isLoading}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{employee.personalCode}</td>
                <td className="admin-inventory-table__actions">
                  <button
                    type="button"
                    className="button button--secondary admin-delete-button"
                    onClick={() => handleDeleteEmployee(employee)}
                    disabled={isLoading}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6}>Ничего не найдено по текущему фильтру.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card admin-employees-page__stats">
        <h2 className="admin-card__title">Статистика по закрытым чекам</h2>
        <p className="admin-card__description">
          Кто чаще закрывал оплаченные заказы на POS за выбранный период (по дате закрытия).
        </p>

        <div className="admin-employees-page__stats-filters">
          <label className="admin-stats-page__filter">
            От
            <input
              type="date"
              className="admin-input"
              value={statsFrom}
              onChange={(e) => setStatsRange((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="admin-stats-page__filter">
            До
            <input
              type="date"
              className="admin-input"
              value={statsTo}
              onChange={(e) => setStatsRange((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
          <button
            type="button"
            className="button button--accent"
            onClick={loadEmployeeStats}
            disabled={statsLoading}
          >
            {statsLoading ? "Загрузка…" : "Применить"}
          </button>
        </div>

        {statsError ? <p className="admin-stats-page__error">{statsError}</p> : null}

        <div className="admin-employees-page__stats-summary admin-stats-grid">
          <article className="card admin-stat-card">
            <p className="admin-stat-card__label">Закрыто чеков</p>
            <p className="admin-stat-card__value">
              {employeeStats ? employeeStats.closedCount : statsLoading ? "…" : "—"}
            </p>
          </article>
          <article className="card admin-stat-card">
            <p className="admin-stat-card__label">Сумма закрытых</p>
            <p className="admin-stat-card__value">
              {employeeStats ? formatMoney(employeeStats.totalRevenue) : statsLoading ? "…" : "—"}
            </p>
          </article>
        </div>

        {topEmployees && topEmployees.length > 0 ? (
          <div className="admin-employees-page__stats-table-wrap">
            <table className="admin-inventory-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Сотрудник</th>
                  <th>Должность</th>
                  <th>Код</th>
                  <th>Закрыто чеков</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {topEmployees.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.rank}</td>
                    <td>{row.fullName}</td>
                    <td>{row.position}</td>
                    <td>{row.personalCode}</td>
                    <td>{row.closedCount}</td>
                    <td>{formatMoney(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {topEmployees?.length === 0 && !statsLoading && employeeStats?.closedCount === 0 ? (
          <p className="admin-card__description admin-employees-page__stats-empty">
            За период нет закрытых чеков с указанным сотрудником.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default AdminEmployeesPage;
