import { useEffect, useMemo, useState } from "react";
import AdminSectionHeader from "./AdminSectionHeader";
import { adminFetch } from "../../utils/adminApi";

const STATUS_OPTIONS = [
  { value: "active", label: "Работает" },
  { value: "vacation", label: "В отпуске" },
  { value: "dismissed", label: "Уволен" },
];

function AdminEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("active");
  const [personalCode, setPersonalCode] = useState("");

  const loadEmployees = () => {
    setIsLoading(true);
    adminFetch("/employees")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Ошибка загрузки: ${res.status}`);
        }
        return data;
      })
      .then((data) => {
        setEmployees(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => setError(err.message || "Ошибка сети"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
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

  const handleCreateEmployee = () => {
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
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Ошибка создания: ${res.status}`);
        }
        return data;
      })
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

  const handleStatusChange = (employee, nextStatus) => {
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
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Ошибка обновления: ${res.status}`);
        }
        return data;
      })
      .then(() => loadEmployees())
      .catch((err) => {
        setError(err.message || "Ошибка сети");
        setIsLoading(false);
      });
  };

  const handleDeleteEmployee = (employee) => {
    const isConfirmed = window.confirm(`Удалить сотрудника "${employee.fullName}"?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    setError("");
    adminFetch(`/employees/${employee.id}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `Ошибка удаления: ${res.status}`);
        }
        return data;
      })
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
    </section>
  );
}

export default AdminEmployeesPage;
