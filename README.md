# Campa Juve 2027 — 9.ª Edición (Landing Page)

Landing page oficial y formulario de inscripción para **Campa Juve 2027 — 9.ª Edición** (Parroquia Nuestra Señora de Belén, Colastiné Norte — Diócesis de Santa Fe, Argentina).

## Estructura del Proyecto

- `index.html`: Estructura semántica mobile-first con las 6 secciones oficiales.
- `css/styles.css`: Sistema de diseño con tipografía `Montserrat` y paleta oficial (`#08223B`, `#F26A44`, `#336699`, `#663333`).
- `js/config.js`: **Archivo centralizado de configuración** (fechas, lugar, arancel, Alias, CBU, Link de Pago, WhatsApp y URL de Google Apps Script).
- `js/app.js`: Lógica interactiva (cálculo automático de edad, bloque condicional de autorización para menores de 18 años, carga y vista previa de comprobante, generación de código `CJ27-XXXX` y envío `POST` a Google Sheets).
- `assets/logo-campa-juve-2027.png`: Logotipo oficial de la 9.ª edición.
- `google-apps-script/Code.gs`: Script listo para desplegar en Google Sheets (con soporte opcional para guardar comprobantes en Google Drive).

## Cómo configurar antes de publicar

1. Editá `js/config.js` y completá:
   - `GOOGLE_SCRIPT_URL`: URL de tu implementación web de Google Apps Script.
   - `EVENT_DATES`, `EVENT_LOCATION`, `FEE_AMOUNT`, `PAYMENT_LINK`, `BANK_ALIAS`, `BANK_CBU`, `WHATSAPP_NUMBER`, `INSTAGRAM_URL`.
2. Para conectar Google Sheets:
   - Abrí una hoja nueva de Google Sheets → **Extensiones → Apps Script**.
   - Pegá el contenido de `google-apps-script/Code.gs`.
   - Opcional: pegá el ID de una carpeta de Google Drive en `DRIVE_FOLDER_ID` para guardar los comprobantes adjuntos automáticamente.
   - Hacé clic en **Implementar → Nueva implementación → Aplicación web** (*Ejecutar como: Yo*, *Quién tiene acceso: Cualquier persona*).
   - Pegá la URL resultante en `GOOGLE_SCRIPT_URL` dentro de `js/config.js`.
3. Publicá la carpeta completa en GitHub Pages, Netlify, Vercel o cualquier hosting estático.
