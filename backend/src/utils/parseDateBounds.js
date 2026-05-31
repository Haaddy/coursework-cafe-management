const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDateRange(fromRaw, toRaw) { // ! функция парсинга даты
  if (fromRaw == null || toRaw == null || String(fromRaw).trim() === "" || String(toRaw).trim() === "") {
    throw new Error("Query params from and to are required");
  }

  let from = String(fromRaw).trim(); // ! получение даты начала
  let to = String(toRaw).trim(); // ! получение даты конца

  if (DATE_ONLY.test(from)) {
    from = `${from}T00:00:00.000Z`; // ! добавление времени в дату начала
  }
  if (DATE_ONLY.test(to)) {
    to = `${to}T23:59:59.999Z`; // ! добавление времени в дату конца  
  }

  const fromMs = Date.parse(from); // ! получение времени начала
  const toMs = Date.parse(to); // ! получение времени конца
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new Error("Invalid from or to date"); // ! отправка ошибки если дата начала или конца не валидна
  }
  if (fromMs > toMs) {
    throw new Error("from must be before or equal to to"); // ! отправка ошибки если дата начала больше даты конца
  }

  return {
    fromIso: new Date(fromMs).toISOString(), // ! получение ISO даты начала
    toIso: new Date(toMs).toISOString(),
  };
}


function parseOptionalDateBounds(fromRaw, toRaw) { // ! функция парсинга необязательных дат
  const fromTrim = fromRaw != null ? String(fromRaw).trim() : ""; // ! получение даты начала
  const toTrim = toRaw != null ? String(toRaw).trim() : ""; // ! получение даты конца

  let fromIso = null; // ! получение ISO даты начала
  let toIso = null; // ! получение ISO даты конца

  if (fromTrim) { 
    let from = fromTrim; // ! получение даты начала 
    if (DATE_ONLY.test(from)) {
      from = `${from}T00:00:00.000Z`;
    }
    const fromMs = Date.parse(from);
    if (Number.isNaN(fromMs)) {
      throw new Error("Invalid from date");
    }
    fromIso = new Date(fromMs).toISOString();
  }

  if (toTrim) {
    let to = toTrim;
    if (DATE_ONLY.test(to)) {
      to = `${to}T23:59:59.999Z`;
    }
    const toMs = Date.parse(to);
    if (Number.isNaN(toMs)) {
      throw new Error("Invalid to date");
    }
    toIso = new Date(toMs).toISOString();
  }

  if (fromIso && toIso && Date.parse(fromIso) > Date.parse(toIso)) {
    throw new Error("from must be before or equal to to");
  }

  return { fromIso, toIso };
}

module.exports = { parseDateRange, parseOptionalDateBounds, DATE_ONLY };
