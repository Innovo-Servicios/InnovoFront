import { describe, expect, test } from "bun:test";
import { ADMIN_ROUTE_PERMISSIONS, permissionForPath } from "./accessControl";

describe("admin route permissions", () => {
  test("maps every administrative module to a stable permission", () => {
    expect(permissionForPath("/adm/workers")).toBe("trabajadores.ver");
    expect(permissionForPath("/adm/roles")).toBe("accesos.ver");
    expect(permissionForPath("/adm/asignaciones/historial")).toBe("asignaciones.ver");
  });

  test("does not treat unknown paths as permission-controlled modules", () => {
    expect(permissionForPath("/adm/desconocido")).toBeUndefined();
  });

  test("keeps navigation paths unique", () => {
    const paths = ADMIN_ROUTE_PERMISSIONS.map(({ href }) => href);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
