import api from "../../lib/api.js";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

const InventoryDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) return;

    const fetchItem = async () => {
      try {
        const response = await api.getById(String(id));
        if (response.ok) {
          const data = await response.json();
          setItem(data);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };
    fetchItem();
  }, [id]);

  if (!item) return <div>Cargando inventario...</div>;
  return <div className="p-4"><h1>{item.name}</h1></div>;
};

export default InventoryDetail;
