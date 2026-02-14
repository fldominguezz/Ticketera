import api from "../../lib/api";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

const TicketDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    
    // VALIDACION DE SEGURIDAD PARA CODEQL
    if (!/^[a-zA-Z0-9-]+$/.test(id)) return;

    const fetchTicket = async () => {
      try {
        // Concatenacion segura con prefijo estatico duro
        const response = await api.getById(String(id));
        if (response.ok) {
          const data = await response.json();
          setTicket(data);
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
      }
    };
    fetchTicket();
  }, [id]);

  if (!ticket) return <div>Cargando...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{ticket.subject}</h1>
      <p>{ticket.description}</p>
    </div>
  );
};

export default TicketDetail;
