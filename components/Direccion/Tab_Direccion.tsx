"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Accordion,
  AccordionItem,
  Divider,
  Card,
  CardHeader,
  CardBody,
  Spinner
} from "@heroui/react";
import { useAsyncList } from "@react-stately/data";
import { URL } from "../../config/config";
import { useAuth } from "../../app/AuthContext";
import styles from "../../styles/sectores.module.css";
import { useDireccion } from "@/app/adm/direcciones/DireccionProvider";
interface Sector {
  id: string;
  NumeroSector: number;
  sector: string;
}

interface Rutas {
  NumeroRuta: number;
  sectores: Sector[];
}

export default function Tab_Direccion() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const { token, authenticatedFetch } = useAuth();
  const {setDirecciones} = useDireccion();
  const list = useAsyncList<Rutas>({
    async load({ signal }) {
      if (!token) {
        setIsLoading(false);
        return { items: [] };
      }

      setIsLoading(true);
      const res = await authenticatedFetch(`${URL}/sector/tablaSectores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        signal,
      });

      const json = await res.json();
      setIsLoading(false);

      return {
        items: json,
      };
    },
  });

  useEffect(() => {
    if (token) {
      list.reload();
    }
  }, [token]);

  const handleSectorClick = async (sectorId: number) => {
    setSelectedSector(sectorId);
    const data = {
      token,
      NumeroSector: sectorId,
    };
    const res = await authenticatedFetch(`${URL}/direccion/obtenerDireccionesSector`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setDirecciones(json);
  };

  return (
    <Card className="w-full h-full p-1">
      <CardHeader>
        <h1 className="text-2xl font-bold">Rutas</h1>
      </CardHeader>
      <CardBody className={styles.CardOverlay}>
        {isLoading ? (
          <Spinner size="md" />
        ) : (
          <Accordion>
            {list.items.map((item: Rutas) => (
              <AccordionItem
                key={item.NumeroRuta}
                title={`Ruta ${item.NumeroRuta}`}
              >
                {item.sectores.map((sector: Sector, index: number) => (
                  <React.Fragment key={sector.id}>
                    <button
                      onClick={() => handleSectorClick(sector.NumeroSector)}
                      className={`text-left w-full ${
                        selectedSector === sector.NumeroSector ? "bg-gray-300" : ""
                      }`}
                    >
                      Sector: {sector.sector}
                    </button>
                    {index < item.sectores.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardBody>
    </Card>
  );
}
