import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

const FormDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) return;

    const fetchForm = async () => {
      try {
        const response = await fetch("/api/v1/forms/" + id);
        if (response.ok) {
          const data = await response.json();
          setForm(data);
        }
      } catch (error) {
        console.error("Error fetching form:", error);
      }
    };
    fetchForm();
  }, [id]);

  if (!form) return <div>Cargando formulario...</div>;
  return <div className="p-4"><h1>{form.name}</h1></div>;
};

export default FormDetail;
