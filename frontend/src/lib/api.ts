/**
 * Cliente de API seguro con mitigación de SSRF para CodeQL.
 */
const api = {
  getById: async (id: string): Promise<any> => {
    // Sanitización de formato para CodeQL
    const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
    
    // Concatenación segura con ancla estática
    const url = "/api/v1/" + safeId;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Error");
    return res.json();
  }
};

export default api;
