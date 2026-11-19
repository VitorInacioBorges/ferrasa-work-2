export function splitFieldErrors(error, fieldNames) {
  const fields = {};
  const general = [];
  for (const { field, message } of error?.details ?? []) {
    if (fieldNames.includes(field)) {
      (fields[field] ??= []).push(message);
    } else {
      general.push(message);
    }
  }
  return { fields, general: general.join(" ") };
}
