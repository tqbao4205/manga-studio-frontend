export const monthStr = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`
