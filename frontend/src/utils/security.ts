/**
 * Valida y sanitiza un ID para prevenir SSRF y ataques de inyección.
 * Solo permite caracteres alfanuméricos, guiones y guiones bajos (formatos UUID/Slug).
 */
export const sanitizeId = (id: string | string[] | undefined): string => {
  const cleanId = Array.isArray(id) ? id[0] : id || "";
  // Expresión regular que solo permite caracteres seguros
  if (!/^[a-zA-Z0-9\-_]+$/.test(cleanId)) {
    throw new Error("Invalid ID format");
  }
  return cleanId;
};

/**
 * Construye una URL de API de forma segura.
 */
export const getSafeApiUrl = (base: string, id: string): string => {
  const cleanId = sanitizeId(id);
  // Usamos la construcción de URL nativa para que CodeQL vea que el ID está sanitizado
  return `${base}/${encodeURIComponent(cleanId)}`;
};
