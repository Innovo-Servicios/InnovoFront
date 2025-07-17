# API Collection - Requests


### Descripción de las Carpetas, Solicitudes y Modelos

---

#### 1. **Asignación**
   - **Asignaciones X Dia**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.asignacion.base_url }}obtenerAsignacionDia`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "fecha": "2024-10-07"
       }
       ```
   - **Modificar Asignación**
     - **Método**: PUT
     - **URL**: `{{ _.endpoints.asignacion.base_url }}modificarasigancion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "Nuevotrabajador": "20731153-7",
         "Nuevoapoyo": "7873654-2",
         "idAsignacion": "6701a216e59e6d21ba0195c3"
       }
       ```
   - **Obtener Asignación por Día**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.asignacion.base_url }}obtenerAsignacion`
     - **Body**:
       ```json
       {
         "token": "TOKEN",
         "NumeroSector": 11,
         "fecha": "2024-10-07"
       }
       ```
   - **Obtener Asignaciones Mes**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.asignacion.base_url }}asignacionMes`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}"
       }
       ```
   - **Asignar Sector**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.asignacion.base_url }}asignarsector`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "trabajadorRut": "7873654-2",
         "sectorNumero": 11,
         "tipo": "lectura",
         "fechaconsulta": "2024-10-07"
       }
       ```

---

#### 2. **Cliente**
   - **Obtener Cliente**
     - **Método**: GET
     - **URL**: `{{ _.endpoints.cliente.base_url }}obtenercliente`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroCliente": 107944
       }
       ```
   - **Crear Cliente**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.cliente.base_url }}crearcliente`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroCliente": 107944,
         "nombre": "{% faker 'randomFirstName' %}"
       }
       ```
   - **Eliminar Cliente**
     - **Método**: DELETE
     - **URL**: `{{ _.endpoints.cliente.base_url }}eliminarcliente`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroCliente": 107944
       }
       ```

---

#### 3. **Dirección**
   - **Modificar Coordenadas**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.direccion.base_url }}modificarCoord`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "Numeromedidor": 42478,
         "lat": "{% faker 'randomLatitude' %}",
         "lng": "{% faker 'randomLongitude' %}"
       }
       ```
   - **Obtener Direcciones por Sector**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.direccion.base_url }}obtenerDireccionesSector`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroSector": 1
       }
       ```
   - **Obtener Dirección**
     - **Método**: GET
     - **URL**: `{{ _.endpoints.direccion.base_url }}obtenerdireccion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "Numeromedidor": 0
       }
       ```
   - **Modificar Dirección**
     - **Método**: PUT
     - **URL**: `{{ _.endpoints.direccion.base_url }}modificardireccion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "Numeromedidor": 0,
         "Nuevocalle": "{% faker 'randomLoremWord' %}",
         "Nuevonumero": "{% faker 'randomInt' %}",
         "Nuevoblock": "{% faker 'randomInt' %}",
         "Nuevodepto": "{% faker 'randomInt' %}",
         "Nuevonombre": "{% faker 'randomLoremWord' %}",
         "Nuevocomuna": "{% faker 'randomLoremWord' %}",
         "Nuevociudad": "{% faker 'randomLoremWord' %}",
         "Nuevoregion": "{% faker 'randomLoremWord' %}"
       }
       ```
   - **Crear Dirección**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.direccion.base_url }}agregardireccion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroSector": "1",
         "Numeromedidor": "0",
         "calle": "{% faker 'randomLoremWord' %}",
         "numero": "{% faker 'randomInt' %}",
         "block": "{% faker 'randomInt' %}",
         "depto": "{% faker 'randomInt' %}",
         "comuna": "{% faker 'randomLoremWord' %}",
         "ciudad": "{% faker 'randomLoremWord' %}",
         "region": "{% faker 'randomCity' %}",
         "lat": "{% faker 'randomLatitude' %}",
         "lng": "{% faker 'randomLongitude' %}"
       }
       ```

---

#### 4. **Lectura**
   - **Obtener Lectura**
     - **Método**: GET
     - **URL**: `{{ _.endpoints.lectura.base_url }}obtenerlectura`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroMedidor": "0",
         "fecha": "2024-10-05"
       }
       ```
   - **Crear Lectura**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.lectura.base_url }}crearlectura`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroRuta": "1",
         "NumeroSector": "1",
         "NumeroMedidor": "0",
         "lectura": "{% faker 'randomInt' %}",
         "foto": "{% faker 'randomImageUrl' %}",
         "clave": "{% faker 'randomLoremWords' %}"
       }
       ```

---

#### 5. **Medidor**
   - **Agregar Medidor**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.medidor.base_url }}agregarmedidor`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroCliente": 1,
         "NumeroMedidor": 107946
       }
       ```

---

#### 6. **Middleware**
   - **Asignación Medidor**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.middleware.base_url }}asignacionMedidor`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroMedidor": 0,
         "fecha": "2024-10-07",
         "texto": "{% faker 'randomLoremWord' %}",
         "foto": "{% faker 'randomLoremWord' %}",
         "tipo": "{% faker 'randomLoremWord' %}"
       }
       ```

---

#### 7. **Notificación Vista**
   - **Registro de Notificación**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.notificacion_vista.base_url }}registroNotificacion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "idNotificacion": "67017e43f379e6d065c91fb1",
         "rut": "7873654-2"
       }
       ```

---

#### 8. **Notificaciones**
   - **Obtener Notificaciones**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.notificaciones.base_url }}obtenerNotificaciones`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "rut": "11111111-1"
       }
       ```
   - **Eliminar Notificación**
     - **Método**: DELETE
     - **URL**: `{{ _.endpoints.notificaciones.base_url }}eliminarNotificacion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "id": "66c958a06a73ed3cee79c9a2"
       }
       ```
   - **Crear Notificación a uno**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.notificaciones.base_url }}crearNotificacion`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "objetivo": "7873654-2",
         "tipo": "documento",
         "titulo": "{% faker 'randomLoremWords' %}",
         "mensaje": "{% faker 'randomLoremParagraph' %}",
         "contenido": "{% faker 'randomLoremWord' %}",
         "url": "{% faker 'randomUrl' %}"
       }
       ```
   - **Crear Notificación a todos**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.notificaciones.base_url }}crearNotificacionTodos`
     - **Body**:
       ```json
        {
	"token":"{{ _.auth.token }}",
	"tipo":"documento",
	"titulo":"{% faker 'randomLoremSentence' %}",
	"mensaje":"{% faker 'randomLoremParagraph' %}",
	"contenido":"{% faker 'randomLoremSentence' %}",
	"url":"{% faker 'randomUrl' %}"
        }
       ```

---

#### 9. **Novedad**
   - **Crear Novedad**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.novedad.base_url }}crearnovedad`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "TipoNovedadConsulta": "nose12345",
         "Fotografia": "{% faker 'randomAlphaNumeric' %}",
         "idMedidor": 3,
         "Lecturacorrecta": "{% faker 'randomInt' %}",
         "Comentario": "{% faker 'randomLoremWord' %}"
       }
       ```

---

#### 10. **Rutas**
   - **Crear Ruta**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.ruta.base_url }}crearrutas`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroRuta": "{% faker 'randomInt' %}"
       }
       ```

---

#### 11. **Sector**
   - **Crear Sector**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.sector.base_url }}crearsectores`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroRuta": 1,
         "NumeroSector": 166,
         "sector": "{% faker 'randomFullName' %}"
       }
       ```
   - **Obtener Datos Sector**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.sector.base_url }}obtenerDatosSectores`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroSector": 166
       }
       ```
   - **Tabla Sector**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.sector.base_url }}tablaSectores`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}"
       }
       ```
   - **Datos Sector Ruta**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.sector.base_url }}tablaSectores`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "NumeroRuta": 166
       }
       ```
---

#### 12. **Tipo de Novedad**
   - **Obtener Tipo de Novedad**
     - **Método**: GET
     - **URL**: `{{ _.endpoints.tipoNovedad.base_url }}obtenerTipoNovedad`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}"
       }
       ```
   - **Crear Tipo de Novedad**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.tipoNovedad.base_url }}crearTipoNovedad`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "nombre": "nose12345"
       }
       ```
   - **Crear Tipo de Novedad**
     - **Método**: DELETE
     - **URL**: `{{ _.endpoints.tipoNovedad.base_url }}eliminarTipoNovedad`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "id": "66ca86ca41442e7686597a31"
       }
       ```
---

#### 13. **Trabajadores**
   - **Listar Trabajadores**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.trabajador.base_url }}listarTrabajadores`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}"
       }
       ```
   - **Eliminar Trabajador**
     - **Método**: DELETE
     - **URL**: `{{ _.endpoints.trabajador.base_url }}eliminartrabajador`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
         "Rut":"11111111-1"
       }
       ```
   - **Login**
     - **Método**: POST
     - **URL**: `{{ _.endpoints.trabajador.base_url }}login`
     - **Body**:
       ```json
       {
         "rut": "11111111-1",
         "clave":"1234"
       }
       ```
   - **Modificar Datos Trabajador**
     - **Método**: PUT
     - **URL**: `{{ _.endpoints.trabajador.base_url }}modificardatostrabajador`
     - **Body**:
       ```json
       {
         "token": "{{ _.auth.token }}",
    	 "Nuevonombre":"{% faker 'randomFullName' %}",
    	 "Nuevocargo":"lector",
    	 "Nuevocorreo":"{% faker 'randomExampleEmail' %}"
       }
       ```

   - **Crear Trabajador**
     - **Método**: PUT
     - **URL**: `{{ _.endpoints.trabajador.base_url }}modificardatostrabajador`
     - **Body**:
       ```json
        {  
         "rut":"{% rutChileno  %}",  
         "nombre":"{% faker 'randomFullName' %}",  
         "cargo":"supervisor",  
         "correo":"{% faker 'randomExampleEmail' %}",  
         "clave":"1234"
        }
       ```

