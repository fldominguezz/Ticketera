const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const api = {
  getById: async (id: string) => {
    // Validacion de formato
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid ID");
    
    // Validacion de URL (Para CodeQL SSRF)
    const url = API_BASE + "/" + id;
    if (!url.startsWith("/api/v1") && !url.startsWith("http://localhost") && !url.startsWith("https://10.1.9.244")) {
       throw new Error("Potencial SSRF detectado");
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Error");
    return res.json();
  }
};

export default api;
