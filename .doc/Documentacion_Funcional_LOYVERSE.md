# Documentación Funcional — LOYVERSE
## Sistema de Punto de Venta en la Nube

**Versión de análisis:** 1.0  
**Fecha:** Mayo 2026  
**Analista:** SYNTIweb / Carlos Bolívar  
**Caso de uso:** Hamburguesas Gurmet C.A. — Sport Bar Daniel Cheein, Margarita, Venezuela  
**Fuente:** 82 capturas de pantalla del Back Office de Loyverse (account: carbolivar@gmail.com)  
**Documento de referencia:** Documentacion_Funcional_SYNTIPOS.docx

---

## TABLA DE CONTENIDO

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estructura de Navegación Completa](#2-estructura-de-navegación-completa)
3. [POS — Flujo de Venta, Métodos de Pago, Ticket](#3-pos--flujo-de-venta-métodos-de-pago-ticket)
4. [KDS — Pantallas de Cocina](#4-kds--pantallas-de-cocina)
5. [Gestión de Productos e Inventario](#5-gestión-de-productos-e-inventario)
6. [Control de Caja y Turnos](#6-control-de-caja-y-turnos)
7. [Gestión de Personal](#7-gestión-de-personal)
8. [Reportes y Dashboard](#8-reportes-y-dashboard)
9. [Configuración del Sistema](#9-configuración-del-sistema)
10. [Planes y Precios](#10-planes-y-precios)
11. [GAP Analysis vs SportBar](#11-gap-analysis-vs-sportbar)
12. [Conclusiones y Recomendaciones](#12-conclusiones-y-recomendaciones)

---

## 1. RESUMEN EJECUTIVO

Loyverse (acrónimo de "Love Your Verse") es un sistema POS SaaS basado en la nube, orientado a pequeños y medianos negocios de hostelería y retail. Opera a través de una aplicación móvil (iOS/Android) para el punto de venta y un back office web completo accesible en `r.loyverse.com/dashboard`. La cuenta analizada pertenece al negocio "Hamburguesas Gurmet C.A." de Daniel Cheein, ubicado en Margarita, Venezuela, configurado con moneda Bolívar Venezolano (VEF) y zona horaria UTC-04:30 Caracas.

### Módulos Identificados

| # | Módulo | Tipo | Plan Requerido | Estado en Cuenta |
|---|--------|------|----------------|-----------------|
| 1 | **Cuenta** | Perfil y configuración básica | Gratuito | Activo |
| 2 | **Informes** | Reportes de ventas y operaciones | Gratuito | Activo (sin datos) |
| 3 | **Artículos** | Catálogo de productos, categorías, modificadores, descuentos | Gratuito | Activo (vacío) |
| 4 | **Administración de Inventario** | Órdenes de compra, transferencias, ajustes, producción | Add-on $30/mes | En prueba (13 días restantes) |
| 5 | **Empleados** | Lista de staff, roles, permisos, asistencia | Add-on (Gestión del personal) | En prueba |
| 6 | **Clientes** | Base de datos de clientes, programa de lealtad | Gratuito | Activo (vacío) |
| 7 | **Integraciones** | Apps de terceros (contabilidad, ecommerce, marketing) | Variable | Disponible |
| 8 | **Configuración** | Sistema, TPV, impresoras, recibo, tiendas, dispositivos | Gratuito | Activo |
| 9 | **POS App** | Aplicación móvil de punto de venta | Gratuito | Instalada |
| 10 | **KDS** | Kitchen Display System vía impresoras de cocina | Funcionalidad integrada | Configurable |

### Características Clave de Loyverse
- **Modelo SaaS freemium:** POS básico gratuito, funcionalidades avanzadas por suscripción.
- **Arquitectura multi-dispositivo:** Un back office central, múltiples TPV conectados.
- **Multi-tienda nativa:** Soporte para múltiples locales desde una sola cuenta.
- **Offline-capable:** La app móvil opera sin internet (sincronización posterior).
- **Moneda local:** Soporte para Bolívar Venezolano (VEF) configurado.
- **Idioma:** Interfaz completamente en español.

---

## 2. ESTRUCTURA DE NAVEGACIÓN COMPLETA

### 2.1 Back Office Web (`r.loyverse.com/dashboard`)

La navegación principal se ubica en un sidebar izquierdo colapsable con iconos. Al expandirlo muestra:

```
┌─────────────────────────────────┐
│  [Logo Loyverse]                │
│  ● Propietario (nombre/email)   │
├─────────────────────────────────┤
│  📊  Informes                   │
│       ├── Resumen de ventas     │
│       ├── Ventas por artículo   │
│       ├── Ventas por categoría  │
│       ├── Ventas por empleado   │
│       ├── Ventas por tipo pago  │
│       ├── Recibos               │
│       ├── Ventas por modificador│
│       ├── Descuentos            │
│       ├── Impuestos             │
│       └── Caja (turnos)         │
│                                 │
│  🛍️  Artículos                  │
│       ├── Lista de artículos    │
│       ├── Categorías            │
│       ├── Modificadores         │
│       └── Descuentos            │
│                                 │
│  📦  Administración Inventario  │
│       ├── Órdenes de compra     │
│       ├── Órdenes de transf.    │
│       ├── Ajustes de stock      │
│       ├── Recuentos inventario  │
│       ├── Producciones          │
│       ├── Proveedores           │
│       ├── Historial inventario  │
│       └── Valoración inventario │
│                                 │
│  👥  Empleados                  │
│       ├── Lista de empleados    │
│       ├── Derechos de acceso    │
│       ├── Tarjetas de asistencia│
│       └── Total horas trabajadas│
│                                 │
│  👤  Clientes                   │
│       └── Base de clientes      │
│                                 │
│  🔗  Integraciones              │
│       ├── Apps                  │
│       └── Fichas de acceso      │
│                                 │
│  ⚙️  Configuración              │
│       ├── Funciones             │
│       ├── Facturación y suscr.  │
│       ├── Métodos de pago       │
│       ├── Lealtad               │
│       ├── Impuestos             │
│       ├── Recibo                │
│       ├── Tickets abiertos      │
│       ├── Impresoras de cocina  │
│       ├── Tipo de pedido        │
│       ├── Tiendas               │
│       └── Dispositivos TPV      │
│                                 │
│  ❓  Ayuda                      │
└─────────────────────────────────┘
```

### 2.2 Aplicación Móvil TPV

La app de TPV en dispositivos iOS/Android tiene su propia navegación interna. Si bien el análisis se centró en el back office web, se identifican los siguientes módulos accesibles desde el TPV según la configuración de permisos:

- Pantalla principal de venta (grid de artículos o búsqueda)
- Carrito / Ticket activo
- Métodos de pago (Efectivo, Tarjeta y adicionales configurados)
- Tickets abiertos (mesas, clientes)
- Devoluciones
- Apertura/cierre de caja (turno)
- Informes básicos
- Configuración del dispositivo

### 2.3 Jerarquía de Acceso

```
Cuenta (owner) ─┬─ Back Office (web)
                │       └── Gestión completa
                └─ App TPV (móvil/tablet)
                        └── Operación diaria
```

---

## 3. POS — FLUJO DE VENTA, MÉTODOS DE PAGO, TICKET

### 3.1 Flujo General de Venta

Basado en la configuración observada en el back office, el flujo estándar de venta en el TPV de Loyverse es:

```
[Inicio de turno] → [Seleccionar artículos] → [Aplicar modificadores/descuentos]
       ↓
[Revisar ticket] → [Seleccionar tipo de pedido] → [Seleccionar método de pago]
       ↓
[Procesar cobro] → [Imprimir/enviar recibo] → [Continuar o cerrar turno]
```

### 3.2 Tipos de Pedido Preconfigurados

Loyverse viene con tres tipos de pedido por defecto, configurados en `Configuración → Tipo de pedido`:

| Tipo | Descripción | Estado |
|------|-------------|--------|
| **Comer dentro** | Consumo en local (mesa) | Tipo por defecto |
| **Para llevar** | Orden para llevar | Activo |
| **A domicilio** | Delivery | Activo |

El operador puede añadir tipos personalizados desde el back office.

### 3.3 Métodos de Pago

Configurados en `Configuración → Métodos de pago`:

| Método | Estado | Tipo |
|--------|--------|------|
| **Efectivo** | Activo (por defecto) | Nativo |
| **Tarjeta** | Activo (por defecto) | Nativo |
| + Personalizados | Configurables | Añadibles (ej: transferencia, pago móvil) |

Los métodos se pueden reordenar con drag & drop en la configuración. En el contexto venezolano, es crítico poder añadir métodos personalizados como "Pago Móvil", "Zelle" o "Transferencia Bancaria".

### 3.4 Tickets Abiertos (Mesas)

La funcionalidad de **Tickets Abiertos** permite guardar y editar pedidos antes de completarlos. Esto se usa típicamente para gestión de mesas. Configuración en `Configuración → Tickets abiertos`:

- Toggle de habilitación (activar/desactivar)
- Una vez activo, permite reasignar ventas a "mesas abiertas" o clientes
- Soporta múltiples tickets simultáneos por dispositivo
- Los tickets pueden confirmarse, modificarse o cancelarse antes del cobro

Permiso específico en roles de empleado: **"Controlar todos los tickets abiertos"** y **"Confirmar los tickets abiertos"**.

### 3.5 Estructura del Recibo

Configurado en `Configuración → Recibo`:

| Campo | Valor/Opción |
|-------|-------------|
| Estilo de cabecera | 2 opciones: logo centrado / texto |
| Texto de cabecera | Libre (campo de texto) |
| Texto de pie | Libre (campo de texto) |
| Mostrar info del cliente | Toggle (activo) |
| Mostrar comentarios | Toggle |
| Idioma del recibo | Español |

El recibo puede enviarse digitalmente o imprimirse. La cuenta tiene configurada la zona horaria de Caracas que se refleja en el timestamp del ticket.

### 3.6 Descuentos en Venta

Los descuentos se gestionan en `Artículos → Descuentos` y se aplican durante la venta:

- Descuentos creados previamente en el back office
- Aplicables a línea de artículo o al total del ticket
- Permiso de empleado: **"Aplicar descuentos en el ticket activo"**
- Reporte dedicado: `Informes → Descuentos`

### 3.7 Modificadores

Los modificadores permiten opciones adicionales a los artículos (ej: "sin cebolla", "extra queso"). Se configuran en `Artículos → Modificadores`:

- Se crean grupos de opciones aplicables a artículos específicos
- Se seleccionan en el momento de la venta desde el TPV
- Reporte dedicado: `Informes → Ventas por modificador`

### 3.8 Devoluciones

Loyverse soporta devoluciones/reembolsos:

- Accesibles desde el recibo original
- Requiere permiso de empleado: **"Realizar devoluciones de compras"** y **"Reasignar y cancelar recibos"**
- Se reflejan en `Informes → Recibos` (contador separado de reembolsos)
- Aparecen en el resumen de ventas como línea de "Devoluciones" que descuenta de Ventas Brutas

---

## 4. KDS — PANTALLAS DE COCINA

### 4.1 Estado de KDS en Loyverse

Loyverse **no tiene un módulo KDS independiente** como pantalla digital nativa en la app web o como aplicación separada de cocina. Sin embargo, implementa la funcionalidad de kitchen display a través del módulo de **Impresoras de Cocina**, que puede operar con:

1. **Impresora física de recibos** (térmica) para cocina
2. **Pantalla KDS** (mencionado en la configuración como alternativa a impresora)

### 4.2 Configuración de Impresoras de Cocina

Ubicado en `Configuración → Impresoras de cocina`:

- Se crean **Grupos de Impresión**: cada grupo es una estación (cocina, bar, etc.)
- Al grupo se le asignan artículos o categorías específicas
- Cuando se registra un pedido con artículos del grupo, se imprime/envía automáticamente a esa estación

El toggle en `Configuración → Funciones → Impresoras de cocina` debe estar activado para habilitar la funcionalidad.

### 4.3 Routing de Órdenes (Inferido)

| Artículo/Categoría | Estación | Mecanismo |
|-------------------|----------|-----------|
| Artículos asignados al Grupo "Cocina" | Impresora Cocina | Automático al cerrar ticket |
| Artículos asignados al Grupo "Bar" | Impresora Bar | Automático al cerrar ticket |
| Artículos sin grupo asignado | Sin impresión de cocina | Solo en ticket principal |

### 4.4 Limitaciones del KDS de Loyverse

- No existe pantalla de visualización en tiempo real con estados (NUEVO → EN PREPARACIÓN → LISTO)
- No hay sistema de "bump" digital
- No hay diferenciación de estados por artículo dentro de un mismo ticket
- La comunicación es unidireccional: TPV → Impresora (no hay feedback de cocina al mesero)
- No hay dashboard de cocina en el back office web

**Conclusión KDS:** Loyverse opera con impresoras físicas, no con KDS digital interactivo. Esto es una limitación importante frente a SportBar.

---

## 5. GESTIÓN DE PRODUCTOS E INVENTARIO

### 5.1 Catálogo de Artículos

Módulo `Artículos → Lista de artículos`:

#### Campos del formulario "Crear Artículo"

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **Nombre** | Texto | Nombre del artículo |
| **Categoría** | Dropdown | "Sin categoría" por defecto |
| **Descripción** | Texto libre | Descripción extendida |
| **Disponible para venta** | Checkbox | Activa/desactiva visibilidad en TPV |
| **Vendido por** | Radio | Unidad / Peso-Volumen |
| **Precio** | Numérico (Bs.) | Vacío = precio libre en venta |
| **Costo** | Numérico (Bs.) | Bs0,00 por defecto |
| **REF** | Auto-generado | Código de referencia interno (ej: 10000) |
| **Código de barras** | Texto | SKU externo o código EAN |
| **Artículo compuesto** | Toggle | Para artículos que consumen ingredientes |
| **Seguir el inventario** | Toggle | Activa control de stock |
| **Variantes** | Sección | Tallas, colores, sabores |
| **Color y forma / Imagen** | Radio | Representación visual en el TPV |

#### Paleta de colores disponible para artículos y categorías

8 colores: gris, rojo, fucsia, naranja, verde-amarillo, verde, azul, morado.
3 formas geométricas: cuadrado, círculo, círculo outline.

### 5.2 Categorías

Módulo `Artículos → Categorías`:

- Formulario mínimo: Nombre + Color (misma paleta de 8 colores)
- Las categorías organizan artículos en el TPV y en reportes
- Se usan en `Informes → Ventas por categoría`
- Son el único nivel de agrupación de productos (no hay subcategorías)

### 5.3 Modificadores

Módulo `Artículos → Modificadores`:

- Se crean grupos de opciones (ej: "Punto de cocción": crudo, al punto, bien hecho)
- Los grupos se asignan a artículos específicos
- En el TPV, al agregar un artículo con modificador, aparece un modal de selección
- Los modificadores pueden ser de selección única o múltiple

### 5.4 Descuentos

Módulo `Artículos → Descuentos`:

- Se crean con nombre e importe (porcentaje o monto fijo)
- Se aplican en el TPV durante la venta
- Sujetos a permisos de empleado

### 5.5 Variantes de Artículos

La gestión de variantes permite crear un artículo base con múltiples presentaciones:

- Ej: "Hamburguesa Clásica" → Variantes: Simple, Doble, Triple
- Cada variante puede tener precio, costo, REF y código de barras diferentes
- Las variantes se seleccionan en el TPV al agregar el artículo

### 5.6 Artículos Compuestos (Recetas)

El toggle **"Artículo compuesto"** permite vincular un artículo a ingredientes o insumos:

- El artículo compuesto consume stock de sus componentes al venderse
- Requiere que los artículos-ingrediente tengan activo "Seguir el inventario"
- Módulo relacionado: `Administración de Inventario → Producciones`

---

## 6. CONTROL DE CAJA Y TURNOS

### 6.1 Módulo de Turnos

Configurado en `Configuración → Funciones → Cierres de caja por turnos`:

- Toggle de activación (activo en la cuenta analizada)
- Permite controlar dinero que entra y sale del cajón de efectivo
- Los turnos tienen apertura y cierre registrados con timestamp

### 6.2 Reporte de Caja

Módulo `Informes → Caja`:

| Columna | Descripción |
|---------|-------------|
| Piso | Nombre del TPV/tienda |
| Horario de apertura | Timestamp inicio de turno |
| Horario de cierre | Timestamp fin de turno |
| Efectivo teórico en caja | Calculado por el sistema |
| Cantidad de efectivo | Conteo físico ingresado |
| Desviación | Diferencia teórico vs real |

El reporte está filtrado por rango de fechas (por defecto: últimos 30 días).

### 6.3 Apertura de Caja

Desde el TPV al inicio del turno:

- Ingreso del monto de apertura (efectivo inicial)
- Registro de movimientos de efectivo durante el turno (entradas/salidas)
- El permiso **"Cobro de caja"** controla quién puede gestionar el cajón

### 6.4 Cierre de Turno

Al finalizar:

- Recuento manual del efectivo
- El sistema muestra el monto teórico esperado
- Se registra la desviación automáticamente
- El cierre queda registrado en `Informes → Caja`

### 6.5 Movimientos de Caja Manuales

Accesibles desde el TPV durante el turno:

- **Entrada de efectivo:** ingresos ajenos a ventas (ej: cambio de caja)
- **Salida de efectivo:** retiros parciales del cajón
- Cada movimiento requiere descripción o motivo

---

## 7. GESTIÓN DE PERSONAL

### 7.1 Lista de Empleados

Módulo `Empleados → Lista de empleados` en `/employees/list`:

**Campos visibles en tabla:**
- Nombre
- Correo electrónico
- Número de teléfono
- Rol

**Registro detectado en la cuenta:**
- Propietario: carbolivar@gmail.com — Rol: Propietario

**Formulario de creación (`Añadir empleado`):**

| Campo | Tipo |
|-------|------|
| Avatar/foto | Imagen (circular) |
| Nombre | Texto |
| Correo electrónico | Email |
| Número de teléfono | Texto |
| Seleccione funciones | Dropdown (rol) |

### 7.2 Sistema de Roles y Derechos de Acceso

Módulo `Empleados → Derechos de acceso`:

#### Roles Preconfigurados

| Rol | Acceso | Nivel |
|-----|--------|-------|
| **Propietario** | Back Office + TPV | Total |
| **Administrador** | Back Office + TPV | Casi total |
| **Gerente** | Back Office + TPV | Limitado |
| **Cajero** | TPV únicamente | Básico |

#### Permisos Granulares — TPV

Los roles se configuran con toggles individuales por permiso. Permisos identificados para el TPV:

- Acceder pagos
- Aplicar descuentos en una línea
- Aplicar descuentos al ticket completo
- Confirmar los tickets abiertos
- Anular artículos en los tickets abiertos
- Dar o capturar una venta
- Modificar descuentos de ventas
- Realizar devoluciones de compras
- Reasignar y cancelar recibos
- Cobro de caja
- Abrir cajón de dinero
- No cobrar a un cliente
- Ver los artículos al precio de costo
- Ver el código de los artículos
- Modificar la configuración
- Acceder a la asistencia de chat (IA o soporte)
- Cambiar los impuestos en una venta
- Controlar todos los tickets abiertos
- Usar cupones/descuentos al hacer una venta

**Diferencia clave Cajero vs Administrador:**
- El rol **Cajero** tiene permisos como "Modificar la configuración" y "Acceder a asistencia de chat" **desactivados**.
- El rol **Administrador** y **Gerente** tienen la mayoría de permisos activados.

#### Permisos Granulares — Back Office

- Ver reportes de ventas y notificaciones
- Gestionar artículos
- Ver el nivel de las existencias
- Gestionar el inventario
- Gestionar los empleados
- Acceso a la lista de clientes y saldos de puntos
- Administrar los grupos de tiempo
- Administrar facturación
- Manipular la configuración del programa de lealtad
- Configurar los movimientos de caja
- Administrar tipos de pedidos TPV
- Administrar los dispositivos TPV

#### Creación de Roles Personalizados

En `/employees/createpermits`:
- Campo "Nombre" (nombre del rol)
- Toggle TPV (acceso a app)
- Toggle Back Office (acceso al panel web)
- Lista completa de permisos configurables individualmente
- Botones CANCELAR / GUARDAR

### 7.3 Control de Asistencia

Módulo `Empleados → Tarjetas de asistencia`:

Formulario `Crear tarjeta de asistencia`:

| Campo | Tipo |
|-------|------|
| Empleado | Dropdown |
| Fecha de inicio | Selector de fecha |
| Fecha de salida | Selector de fecha |
| Hora del evento | Selector de hora |
| Total de horas | Calculado/manual |

Módulo `Empleados → Total de horas trabajadas`:

- Filtros: rango de fechas + todos los trabajadores
- Tabla: Empleado | Total de horas
- Exportable (inferido por consistencia con otros módulos)

**Nota:** Esta funcionalidad requiere la suscripción **"Gestión del personal"**.

### 7.4 PIN de Empleado

Si bien no se observó directamente la pantalla de configuración de PIN, los permisos de TPV incluyen el acceso por función, lo que implica que cada empleado se identifica en el TPV con algún mecanismo de autenticación (PIN o perfil). Esto se confirma por la existencia del permiso "Acceder pagos" como control de acceso.

---

## 8. REPORTES Y DASHBOARD

### 8.1 Módulos de Informes Disponibles

Todos ubicados bajo `Informes` en el sidebar:

#### 8.1.1 Resumen de Ventas

URL: `/report/sales`

**Filtros:** rango de fechas, tienda, colaborador

**KPIs en tarjetas:**
- Ventas brutas (Bs.)
- Devoluciones (Bs.)
- Descuentos (Bs.)
- Ventas netas (Bs.)
- Beneficio bruto (Bs.)

**Gráfico:** Línea de tiempo de Ventas brutas (diario/semanal/mensual según zoom)

**Tabla exportable:**

| Fecha | Ventas brutas | Devoluciones | Descuentos | Ventas netas | Costo bienes | Beneficio bruto |
|-------|---------------|--------------|------------|--------------|--------------|-----------------|

#### 8.1.2 Ventas por Artículo

URL: `/report/goods` (inferido)

- Filtros: fecha, tienda, colaborador
- Tabla: Artículo | Artículos vendidos | Ventas netas | Costo | Beneficio bruto

#### 8.1.3 Ventas por Categoría

URL: `/report/categories`

**Tabla exportable:**

| Categoría | Artículos vendidos | Ventas netas | Costo de ventas | Beneficio bruto |
|-----------|-------------------|--------------|-----------------|-----------------|

#### 8.1.4 Ventas por Empleado

URL: `/report/employees` (inferido)

- Filtros: fecha, tienda
- Tabla: Empleado | Artículos vendidos | Ventas netas

#### 8.1.5 Ventas por Tipo de Pago

URL: `/report/payment` (inferido)

- Filtros: fecha, tienda
- Tabla: Método de pago | Monto total

#### 8.1.6 Recibos

URL: `/report/receipts`

**KPIs:**
- Recibos (cantidad total)
- Ventas (cantidad)
- Reembolsos (cantidad)

**Tabla exportable:**

| N. de Recibo | Fecha | Empleado | Cliente | Tipo | Total |
|-------------|-------|----------|---------|------|-------|

Paginación: 10 filas por página por defecto.

#### 8.1.7 Ventas por Modificador

URL: `/report/modifiers`

**Tabla:**

| Modificador | Cantidad vendida | Ventas brutas |
|-------------|-----------------|---------------|

#### 8.1.8 Descuentos

URL: `/report/discounts`

**Tabla:**

| Nombre | Descuentos aplicados | Importe del descuento |
|--------|---------------------|----------------------|

#### 8.1.9 Impuestos

URL: `/report/taxes`

**KPIs:**
- Ventas gravadas (Bs.)
- Ventas no gravables (Bs.)
- Ventas netas totales (Bs.)

**Tabla:**

| Nombre de impuesto | Tipo | Ventas gravables | Cuota |
|-------------------|------|-----------------|-------|

#### 8.1.10 Caja (Turnos)

URL: `/report/shift`

**Tabla:**

| Piso | Horario apertura | Horario cierre | Efectivo teórico | Cantidad efectivo | Desviación |
|------|-----------------|----------------|-----------------|-------------------|------------|

### 8.2 Características Comunes de los Reportes

- **Filtro de fecha:** Selector de rango personalizable (por defecto: últimos 30 días)
- **Filtro de tienda:** "Día a tienda" o todas las tiendas
- **Filtro de colaborador:** Todos los colaboradores o uno específico
- **Exportación:** Botón "EXPORTAR" con formato dropdown (presumiblemente CSV/Excel)
- **Estado vacío:** Mensaje explícito cuando no hay datos en el período
- **Moneda:** Todo en Bolívares (Bs.) según la configuración de la cuenta

### 8.3 Dashboard / Inicio

No se identificó un dashboard de inicio específico diferenciado de los reportes. El módulo `Informes → Resumen de Ventas` funciona como el dashboard principal operativo.

---

## 9. CONFIGURACIÓN DEL SISTEMA

### 9.1 Funciones (Feature Toggles)

URL: `/settings/profile`

Lista completa de funciones configurables con toggle ON/OFF:

| Función | Descripción | Estado observado |
|---------|-------------|-----------------|
| **Cierres de caja por turnos** | Control de entrada/salida de efectivo | Activo |
| **Función de ABQ** (asistencia) | Registro entrada/salida empleados y cálculo de horas | Activo |
| **Tickets abiertos** | Guardar y editar pedidos antes de cobrar | Activo |
| **Impresoras de cocina** | Impresión de pedidos en estaciones (KDS) | Activo |
| **Pantalla para clientes** | Visor para clientes en momento de venta | Activo |
| **Tip de pedido** | Añadir propinas en la venta | Activo |
| **Notificaciones de stock bajo** | Alertas cuando stock llega a 0 | Activo |
| **Alertas de stock negativo** | Aviso al cajero cuando artículo no disponible | Activo |
| **Código de barras de peso variable** | Soporte EAN para artículos por peso | Activo |

Todos los toggles estaban en verde (activo) en la cuenta analizada.

### 9.2 Facturación y Suscripciones

URL: `/settings/billing` (o submenú de configuración)

Tres suscripciones disponibles:

| Suscripción | Estado | Precio |
|-------------|--------|--------|
| Gestión de ventas ilimitadas | En prueba (13 días) | Por definir |
| Gestión del personal | En prueba | Por definir |
| Gestión de inventario avanzado | En prueba (13 días) | $30 USD/mes |

**Método de pago:** Sin tarjeta registrada.  
**Datos de facturación:** Pendientes de agregar.

### 9.3 Métodos de Pago

URL: `/settings/paytypes`

- Efectivo (predeterminado, activo)
- Tarjeta (predeterminado, activo)
- Botón `+ AÑADIR MÉTODO DE PAGO` para métodos personalizados
- Los métodos se reordenan con drag & drop

### 9.4 Lealtad (Programa de Puntos)

URL: `/settings/loyalty`

- Campo: puntos acumulados por unidad monetaria gastada (valor: 0.00 en la cuenta)
- Texto explicativo del funcionamiento
- Saldo de puntos visible en `Clientes → Base de clientes`
- Requiere activación y configuración antes de usar

### 9.5 Impuestos

URL: `/settings/taxes`

- No había impuestos configurados en la cuenta analizada
- Se añaden con `+ AGREGAR IMPUESTO`
- Los impuestos se aplican de forma global a los artículos en el TPV
- Nota: No se aplican por artículo específico, sino de forma global a la venta
- Reporte específico: `Informes → Impuestos`

### 9.6 Recibo

URL: `/settings/receipts`

| Campo | Opciones/Valor |
|-------|---------------|
| Estilo de cabecera | Logo centrado / Texto (2 opciones visuales) |
| Texto de cabecera | Campo libre |
| Texto de pie | Campo libre |
| Mostrar info cliente | Toggle (activo) |
| Mostrar comentarios | Toggle |
| Idioma del recibo | Español |

### 9.7 Tickets Abiertos

URL: `/settings/paidlived`

- Toggle para habilitar la función
- Descripción: "Los tickets abiertos le permiten reasignar ventas a mesas abiertas. Por ejemplo: mesas o clientes."
- Cuando está activo, permite múltiples tickets simultáneos en el TPV

### 9.8 Impresoras de Cocina

URL: `/settings/kitchen`

- Función: crear **grupos de impresión** para estaciones de cocina/bar
- Botón `+ AÑADIR GRUPO DE IMPRESIÓN`
- Sin grupos configurados en la cuenta analizada
- Soporta impresoras físicas y pantallas KDS (según documentación)

### 9.9 Tipo de Pedido

URL: `/settings/dining`

Tres tipos predeterminados (no eliminables):

| Tipo | Etiqueta |
|------|----------|
| Comer dentro | Tipos de pedido por defecto |
| Para llevar | — |
| A domicilio | — |

Se pueden añadir tipos personalizados.

### 9.10 Tiendas

URL: `/settings/outlets`

Registro detectado:
- **Hamburguesas Gurmet C A** — Sin dirección — 1 TPV activo

Formulario de creación de tienda:

| Campo | Valor observado |
|-------|----------------|
| Nombre | Texto libre |
| Dirección | Con subcampos: Ciudad, Estado, CP, País |
| País | Venezuela (preseleccionado) |
| Número de teléfono | Texto |
| Descripción | Texto libre |

### 9.11 Dispositivos TPV

URL: `/settings/cashregister`

Registro detectado:
- **TPV 1** — Estado: Activado

Formulario de creación (`Crear TPV`):
- Solo requiere un campo: **Nombre**
- Proceso: crear el registro en back office → instalar la app → vincular con código

---

## 10. PLANES Y PRECIOS

### 10.1 Estructura de Precios de Loyverse

Loyverse opera con modelo **freemium** con add-ons de pago:

#### Plan Base (Gratuito, Forever)

| Módulo | Incluido |
|--------|----------|
| POS App (iOS/Android) | ✅ Ilimitado |
| Artículos/Catálogo | ✅ Ilimitado |
| Reportes básicos de ventas | ✅ |
| 1 tienda / múltiples dispositivos | ✅ |
| Clientes (base de datos básica) | ✅ |
| Integraciones básicas | ✅ |
| Cierres de caja | ✅ |
| Tickets abiertos | ✅ |
| Métodos de pago | ✅ |
| Tipos de pedido | ✅ |

#### Add-on: Gestión de Inventario Avanzado

| Precio | $30 USD/mes por tienda |
|--------|----------------------|
| Prueba gratuita | 14 días |
| Incluye | Órdenes de compra, transferencias entre tiendas, ajustes de stock, recuentos de inventario, producción, proveedores, historial y valoración de inventario |

#### Add-on: Gestión del Personal

| Precio | Por definir (en prueba en la cuenta) |
|--------|-------------------------------------|
| Prueba gratuita | 14 días |
| Incluye | Control de asistencia, tarjetas de asistencia, reporte de horas trabajadas, funciones avanzadas de empleados |

#### Add-on: Gestión de Ventas Ilimitadas

| Estado | En prueba en la cuenta |
|--------|----------------------|
| Incluye | Sin límite de artículos o transacciones (detalles exactos no observados) |

### 10.2 Advertencias sobre Precios

- Los precios están en USD, lo que representa un costo significativo para un negocio venezolano que opera en Bolívares.
- Con una sola tienda y los 3 add-ons activos, el costo mensual podría superar los $50-100 USD/mes.
- El plan gratuito cubre la operación básica de un sport bar sin inventario avanzado ni control de asistencia.
- No se observó integración de pasarela de pagos venezolana (Mercantil, Banesco, etc.) nativa.

### 10.3 Comparativa de Valor

| Escenario | Plan Necesario | Costo estimado/mes |
|-----------|----------------|-------------------|
| Bar simple (sin inventario ni personal) | Gratuito | $0 |
| Bar con inventario controlado | Gratuito + Inventario | $30 |
| Bar con inventario + control de personal | Gratuito + Inventario + Personal | ~$50+ |
| Multi-tienda | Por tienda adicional | Escalable |

---

## 11. GAP ANALYSIS VS SPORTBAR

### 11.1 Tiene Loyverse — Falta en SportBar

Funcionalidades presentes en Loyverse que SportBar aún no tiene implementadas o está desarrollando:

| Funcionalidad | Descripción en Loyverse | Prioridad para SportBar |
|---------------|------------------------|------------------------|
| **Programa de lealtad / puntos** | Acumulación y canje de puntos por cliente, visible en base de clientes | Media — útil para fidelización en sport bar |
| **Tipos de pedido configurables** | Comer dentro / Para llevar / A domicilio preconfigurados | Alta — SportBar necesita distinguir mesa/barra/carry |
| **Control de asistencia de empleados** | Entrada/salida por timestamp, reporte de horas | Media — relevante para gestión de turnos |
| **Órdenes de compra a proveedores** | Creación, envío y seguimiento de pedidos a proveedores | Media — para gestión de insumos del bar |
| **Múltiples tiendas nativas** | Gestión multi-local desde un solo back office | Baja — Daniel opera una sola tienda hoy |
| **Artículos por peso/volumen** | Venta de artículos medidos (gramos, litros) | Baja — relevante para bebidas a granel |
| **Valoración de inventario** | Informe de costo y beneficio bruto del stock | Alta — para control de rentabilidad |
| **Importación masiva de artículos** | CSV import para catálogo | Media — útil en lanzamiento |
| **Integración con apps de terceros** | Contabilidad, ecommerce, marketing | Media — para escalar el negocio |
| **Pantalla para clientes (customer display)** | Visor en mostrador para cliente | Baja — nice-to-have |
| **Propinas (tip)** | Configuración de propinas en la venta | Media — común en sport bars |
| **Código de barras de peso variable** | Soporte para EAN con precio embebido | Baja — no aplica al modelo de bar |

### 11.2 Tiene SportBar — No Tiene Loyverse

Funcionalidades del diseño de SportBar que Loyverse no ofrece o tiene limitaciones importantes:

| Funcionalidad | En SportBar | Limitación en Loyverse |
|---------------|-------------|----------------------|
| **KDS digital interactivo** | Pantallas de cocina con estados NUEVO→PREP→LISTO→ENTREGADO y bump | Solo impresoras físicas; no hay estados digitales ni feedback de cocina |
| **Routing de KDS inteligente** | Hamburguesas → Cocina; Bebidas → Bar; Mixto → ambos simultáneo | No tiene routing diferenciado por estación digital |
| **Tickets con prefijo PUB-/LOC-** | Diferenciación de origen (QR público vs. mesero) | Sistema de tickets más simple, sin origen diferenciado |
| **Visor de comandas (Despacho)** | Pantalla de despacho que espera bump de todas las estaciones | No existe módulo de despacho |
| **Control de tasa BCV en tiempo real** | Precios en USD como referencia, cobro en Bs. al tipo de cambio del día | Loyverse opera con moneda fija; no tiene conversión dinámica de divisas |
| **QR para pedidos desde mesa** | Cliente escanea QR → hace su pedido desde su teléfono → va directo a KDS | No tiene flujo de pedidos por QR público |
| **Validación de comprobantes de pago** | Módulo "validador" que revisa fotos de comprobantes bancarios | No existe módulo de validación fotográfica |
| **Modo offline robusto con IndexedDB** | Sincronización asíncrona con cola de pedidos offline | Offline básico de la app; sin garantías de sync avanzado |
| **PWA instalable** | Funciona como app nativa desde el navegador | Loyverse es app nativa de tienda (App Store/Play Store) |
| **Credenciales por cédula venezolana** | Cada ticket incluye cédula, zona, asiento del mesero | No hay campo de cédula ni identificación venezolana extendida |
| **Multi-método de pago venezolano nativo** | Pago Móvil, Zelle, USD cash, Bs. efectivo integrados | Solo Efectivo y Tarjeta nativos; los demás son "personalizados" sin lógica especial |
| **Roles específicos del negocio** | mesero, cocina, bar, despacho, validador, admin | Roles genéricos: Propietario, Admin, Gerente, Cajero |
| **PIN con bcrypt y throttle** | 4 dígitos hasheados, 5 intentos/min/IP | No se observó detalles de seguridad de PIN |

### 11.3 Irrelevante para el Caso Daniel

Funcionalidades de Loyverse que no aplican al modelo del Sport Bar de Daniel:

| Funcionalidad | Razón de irrelevancia |
|---------------|----------------------|
| **Órdenes de transferencia entre tiendas** | Daniel opera una sola tienda en Margarita |
| **Producción/Manufactura** | El sport bar no fabrica productos a partir de ingredientes a escala industrial |
| **Recuentos de inventario parciales** | Con el catálogo inicial pequeño, no hay necesidad de recuentos parciales complejos |
| **Importación de negocios (bulk)** | No aplica para un negocio de start-up pequeño |
| **Integraciones con plataformas de ecommerce** | Sport bar no tiene venta online |
| **Código de barras EAN estándar** | Los artículos de un bar no tienen código de barras comercial |
| **Historial de inventario avanzado** | En etapa inicial, sin historial acumulado |
| **Fichas de acceso API** | No aplica para usuario no técnico |
| **Valoración de inventario** (a corto plazo) | Irrelevante hasta tener inventario activo |

---

## 12. CONCLUSIONES Y RECOMENDACIONES

### 12.1 Evaluación General de Loyverse

Loyverse es una **solución POS competente para un sport bar simple**, especialmente atractiva por su plan gratuito básico. Sin embargo, presenta **limitaciones estructurales** para el modelo operativo avanzado que SportBar CafeBall pretende implementar.

**Fortalezas de Loyverse:**
- Plan gratuito genuinamente funcional para operación básica
- Interface simple y usable (curva de aprendizaje baja)
- Soporte completo para español y moneda venezolana
- Back office web potente para gestión diaria
- Sistema de reportes bien estructurado
- Roles y permisos granulares
- Módulo de empleados razonablemente completo (con suscripción)

**Debilidades de Loyverse para este caso:**
- **Sin KDS digital real:** La gran limitación. Operar un sport bar con alto volumen sin estados digitales de cocina implica más errores, más tiempo y más confusión.
- **Sin routing inteligente de órdenes:** Un pedido con hamburguesas Y bebidas requiere que alguien decida a dónde va. Loyverse no lo hace automáticamente.
- **Sin gestión de divisas dual:** En Venezuela, la operación diaria exige manejar USD y Bs. con tasa dinámica. Loyverse no tiene esto nativo.
- **Costo en USD:** Para un negocio venezolano, $30/mes por el módulo de inventario es significativo.
- **Sin QR de autoservicio:** El flujo de pedido desde la mesa por QR no existe en Loyverse.

### 12.2 Recomendaciones Estratégicas para Daniel

**Opción A — Usar Loyverse como solución temporal mientras SportBar se completa:**

Utilizar el **plan gratuito de Loyverse** para las operaciones básicas de arranque (tomar pedidos, cobrar, generar recibos) mientras SportBar CafeBall termina de desarrollarse. Ventajas: cero costo, cero configuración técnica, disponible de inmediato. Desventaja: no tendrá KDS ni control avanzado.

**Opción B — Implementar SportBar CafeBall directamente:**

Saltar Loyverse y usar SportBar desde el inicio. El sistema ya tiene definidos los flujos críticos que Loyverse no puede ofrecer (KDS, routing, tasa BCV, QR público). El costo de desarrollo ya está incurrido; el de operación en VPS es menor al add-on de inventario de Loyverse.

**Recomendación del analista:** **Opción B**, con un periodo de prueba paralela de Loyverse en el plan gratuito si el equipo necesita tiempo de entrenamiento antes de la go-live de SportBar.

### 12.3 Elementos de Loyverse que SportBar Debería Adoptar

El análisis de Loyverse sirve como **benchmark de UX y funcionalidad** para SportBar:

1. **Guía de configuración (onboarding):** El panel de "Tasks" de Loyverse es excelente para guiar al nuevo usuario. SportBar debería implementar un wizard de setup similar.
2. **Gestión de tipos de pedido:** La triada Comer dentro / Para llevar / A domicilio es un estándar que SportBar debería tener visible en el flujo de venta.
3. **Estados vacíos con CTA:** Loyverse muestra estados vacíos informativos con botones de acción claros. Buena práctica para SportBar.
4. **Exportación en todos los reportes:** El botón EXPORTAR presente en cada reporte es una necesidad básica que SportBar debe incluir.
5. **Paleta de colores para artículos:** La asignación de color+forma a cada artículo para su identificación rápida en el TPV es una buena práctica de UX.
6. **Roles con permisos granulares:** El nivel de granularidad de Loyverse en permisos por rol es comparable al que SportBar necesita implementar. Loyverse es referencia válida para el alcance de permisos.

### 12.4 Resumen Ejecutivo del GAP

```
LOYVERSE tiene → SPORTBAR no tiene todavía:
  - Lealtad/puntos de clientes
  - Tipos de pedido en flujo POS
  - Control de asistencia de empleados

SPORTBAR tiene → LOYVERSE nunca tendrá:
  - KDS digital interactivo con bump
  - Routing cocina/bar inteligente
  - Tasa BCV dinámica (USD/Bs.)
  - QR de autoservicio para mesas
  - Validación de comprobantes

VEREDICTO: SportBar CafeBall es técnicamente superior
para el caso de uso del Sport Bar de Daniel.
Loyverse es una alternativa viable solo si SportBar
no está listo para el lanzamiento.
```

---

*Documentación generada por SYNTIweb | Análisis basado en 82 capturas de pantalla del Back Office de Loyverse (mayo 2026) | Cuenta: Hamburguesas Gurmet C.A. — Margarita, Venezuela*
