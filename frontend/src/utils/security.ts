export const sanitizeParam = (val: string | number): string => {
  return String(val).replace(/[^a-zA-Z0-9.\-_]/g, "");
};
