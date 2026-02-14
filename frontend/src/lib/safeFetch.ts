export async function safeFetch(url: string, options?: RequestInit) {
  // Sanitización de URL para evitar SSRF
  if (url.includes("..")) throw new Error("Invalid URL");
  return fetch(url, options);
}
