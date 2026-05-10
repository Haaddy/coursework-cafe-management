const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDateRange(fromRaw, toRaw) {
  if (fromRaw == null || toRaw == null || String(fromRaw).trim() === "" || String(toRaw).trim() === "") {
    throw new Error("Query params from and to are required");
  }

  let from = String(fromRaw).trim();
  let to = String(toRaw).trim();

  if (DATE_ONLY.test(from)) {
    from = `${from}T00:00:00.000Z`;
  }
  if (DATE_ONLY.test(to)) {
    to = `${to}T23:59:59.999Z`;
  }

  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new Error("Invalid from or to date");
  }
  if (fromMs > toMs) {
    throw new Error("from must be before or equal to to");
  }

  return {
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(toMs).toISOString(),
  };
}

/**
 * Границы периода необязательны: можно передать только from, только to или оба.
 * Пустые строки / отсутствие параметра — без фильтра по этой границе.
 */
function parseOptionalDateBounds(fromRaw, toRaw) {
  const fromTrim = fromRaw != null ? String(fromRaw).trim() : "";
  const toTrim = toRaw != null ? String(toRaw).trim() : "";

  let fromIso = null;
  let toIso = null;

  if (fromTrim) {
    let from = fromTrim;
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
