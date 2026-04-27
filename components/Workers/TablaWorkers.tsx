"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Pagination,
} from "@heroui/react";
import { useAsyncList } from "@react-stately/data";
import { Search, ChevronDown } from "lucide-react";
import { URL } from "../../config/config";
import { useAuth } from "../../app/AuthContext";
import Drawer_Worker from "./Drawer_Worker";
import { useDisclosure } from "@heroui/react";

interface Worker {
  _id: string;
  Rut: string;
  Nombre: string;
  cargo: string;
  correo: string;
}

export default function TablaWorkers() {
  const [isLoading, setIsLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [workerKey, setWorkerKey] = useState<string>("");
  const [itemsPerPage, setItemsPerPage] = useState(16);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const { isOpen, onOpenChange, onOpen } = useDisclosure();
  const { token, socket } = useAuth();

  const list = useAsyncList<Worker>({
    async load({ signal }) {
      if (!token) {
        setIsLoading(false);
        return { items: [] };
      }

      setIsLoading(true);

      const res = await fetch(`${URL}/trabajador/listarTrabajadores`, {
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

  useEffect(() => {
    if (!socket) return;

    socket.on("nuevo-trabajador", (nuevoTrabajador) => {
      list.append({ ...nuevoTrabajador });
    });

    socket.on("updateWorker", () => {
      list.reload();
    });

    return () => {
      socket.off("nuevo-trabajador");
      socket.off("updateWorker");
    };
  }, [socket, list]);

  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (!tableContainerRef.current) return;

      const containerHeight = tableContainerRef.current.clientHeight;

      const tableHeaderHeight = 48;
      const rowHeight = 40;
      const safePadding = 24;

      const availableHeight = containerHeight - tableHeaderHeight - safePadding;
      const calculatedRows = Math.floor(availableHeight / rowHeight);

      setItemsPerPage(Math.max(calculatedRows, 1));
    };

    calculateItemsPerPage();

    const resizeObserver = new ResizeObserver(() => {
      calculateItemsPerPage();
    });

    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }

    window.addEventListener("resize", calculateItemsPerPage);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateItemsPerPage);
    };
  }, []);

  const filteredItems = useMemo(() => {
    let filtered = list.items;

    if (filterValue) {
      const lowerFilterValue = filterValue.toLowerCase();

      filtered = filtered.filter(
        (item) =>
          item.Rut.toLowerCase().includes(lowerFilterValue) ||
          item.Nombre.toLowerCase().includes(lowerFilterValue) ||
          item.cargo.toLowerCase().includes(lowerFilterValue) ||
          item.correo.toLowerCase().includes(lowerFilterValue)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.cargo === statusFilter);
    }

    return filtered;
  }, [list.items, filterValue, statusFilter]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredItems.length / itemsPerPage);
  }, [filteredItems.length, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const onSearchChange = useCallback((value: string) => {
    setFilterValue(value);
    setCurrentPage(1);
  }, []);

  const onStatusFilterChange = useCallback((keys: any) => {
    setStatusFilter(keys.values().next().value as string);
    setCurrentPage(1);
  }, []);

  const handleDrawer = (key: string) => {
    setWorkerKey(key);
    onOpen();
  };

  const handleDrawerClose = () => {
    setWorkerKey("");
    onOpenChange();
  };

  return (
    <div className="flex flex-col h-full">
      <Drawer_Worker
        isOpen={isOpen}
        onOpenChange={handleDrawerClose}
        onOpen={onOpen}
        workerKey={workerKey}
      />

      <div className="flex justify-between items-center mb-4 p-2 gap-4">
        <Input
          placeholder="Buscar por Rut, nombre, cargo o correo..."
          startContent={<Search />}
          value={filterValue}
          onValueChange={onSearchChange}
          variant="bordered"
        />

        <Dropdown>
          <DropdownTrigger>
            <Button endContent={<ChevronDown />}>Cargo</Button>
          </DropdownTrigger>

          <DropdownMenu
            aria-label="Filtrar por cargo"
            selectionMode="single"
            selectedKeys={new Set([statusFilter])}
            onSelectionChange={onStatusFilterChange}
          >
            <DropdownItem key="all">Todos</DropdownItem>
            <DropdownItem key="lector">Lector</DropdownItem>
            <DropdownItem key="administracion">Administrador</DropdownItem>
            <DropdownItem key="supervisor">Supervisor</DropdownItem>
            <DropdownItem key="inspector">Inspector</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      <div ref={tableContainerRef} className="flex-grow overflow-auto">
        <Table
          aria-label="Tabla de trabajadores con búsqueda y filtro"
          classNames={{
            table: "min-h-[100px] max-h-[93.5vh]",
            wrapper: "bg-[transparent]",
            th: "bg-gradient-to-r from-blue-100 via-purple-200 to-blue-100 text-slate-800 font-bold text-sm",
            td: "text-md",
          }}
          shadow="none"
          isStriped
          color="primary"
          selectionMode="single"
          onRowAction={(key) => {
            const selectedItem = list.items.find((item) => item._id === key);

            if (selectedItem) {
              handleDrawer(selectedItem.Rut);
            }
          }}
        >
          <TableHeader>
            <TableColumn
              style={{
                textAlign: "center",
                borderRightWidth: "0.2rem",
                borderColor: "white",
              }}
              key="Rut"
            >
              RUT
            </TableColumn>

            <TableColumn
              style={{
                textAlign: "center",
                borderRightWidth: "0.2rem",
                borderColor: "white",
              }}
              key="Nombre"
            >
              NOMBRE
            </TableColumn>

            <TableColumn
              style={{
                textAlign: "center",
                borderRightWidth: "0.2rem",
                borderColor: "white",
              }}
              key="cargo"
            >
              CARGO
            </TableColumn>

            <TableColumn
              style={{
                textAlign: "center",
                borderRightWidth: "0.2rem",
                borderColor: "white",
              }}
              key="correo"
            >
              CORREO
            </TableColumn>
          </TableHeader>

          <TableBody
            items={paginatedItems}
            isLoading={isLoading}
            loadingContent={<Spinner label="Cargando trabajadores..." />}
          >
            {(item: Worker) => (
              <TableRow key={item._id}>
                <TableCell style={{ textAlign: "center", cursor: "pointer" }}>
                  {item.Rut}
                </TableCell>

                <TableCell style={{ textAlign: "center", cursor: "pointer" }}>
                  {item.Nombre}
                </TableCell>

                <TableCell style={{ textAlign: "center", cursor: "pointer" }}>
                  {item.cargo.charAt(0).toUpperCase() + item.cargo.slice(1)}
                </TableCell>

                <TableCell style={{ textAlign: "center", cursor: "pointer" }}>
                  {item.correo}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages >= 1 && (
        <div className="mt-auto flex justify-center pb-4">
          <Pagination
            total={totalPages}
            page={currentPage}
            variant="faded"
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}