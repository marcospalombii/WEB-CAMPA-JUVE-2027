/**
 * ==========================================================================
 * CONFIGURACIÓN CENTRALIZADA — CAMPA JUVE 2027 (9.ª EDICIÓN)
 * ==========================================================================
 * Editá únicamente estos valores para actualizar fechas, aranceles, datos
 * bancarios, enlaces y la conexión con Google Sheets sin tocar el resto del código.
 */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxEATClmhshNjMZrc3mInZ8FoKrbnKw56mWFS2__PkUXKsTBwGEW1wWLBhJZQ66RsAc/exec";
const ORGANIZADORES_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgVErmcuEvc03SdjS50FDpopZstp52WsUQlVP2t3X3KJ6GVicDiwXsGBTUCsYSqzxMAg/exec";

const CAMPA_CONFIG = {
  // URL del Web App de Google Apps Script (vinculado a Google Sheets de campistas)
  GOOGLE_SCRIPT_URL: GOOGLE_SCRIPT_URL,
  // URL independiente del Web App de Google Apps Script para la planilla separada de organizadores
  ORGANIZADORES_SCRIPT_URL: ORGANIZADORES_SCRIPT_URL,

  // Datos del evento
  EVENT_NAME: "Campa Juve 2027 — 9.ª Edición",
  EVENT_DATES: "Del 5 al 8 de febrero de 2027",
  EVENT_LOCATION: "Casa de Retiro Padre Lamy · Colastiné Norte, Santa Fe",
  GOOGLE_MAPS_URL: "https://www.google.com/maps/search/?api=1&query=Casa+de+Retiro+Padre+Lamy,+Colastin%C3%A9+Norte,+Santa+Fe,+Argentina",
  AGE_RANGE: "Jóvenes entre 15 a 25 años",

  // Arancel y facilidades
  FEE_AMOUNT: "$100.000",
  FEE_NOTE: "Podés abonar el total, en cuotas con seña inicial o solicitar apoyo del Fondo Solidario.",

  // Datos de pago y transferencia
  PAYMENT_LINK: "https://mpago.la/REEMPLAZAR_LINK_DE_PAGO",
  BANK_ALIAS: "jovenes.belen",
  BANK_CBU: "0000003100000000000000",
  BANK_HOLDER: "Parroquia Nuestra Señora de Belén",
  BANK_CUIT: "30-53838876-5",
  BANK_NAME: "Santander",

  // Contacto y redes (formato internacional sin '+' ni espacios para WhatsApp)
  WHATSAPP_NUMBER: "5493425000000",
  WHATSAPP_DEFAULT_MSG: "¡Hola! Tengo una consulta sobre Campa Juve 2027 (9.ª Edición).",
  INSTAGRAM_URL: "https://instagram.com/campajuve.sfe",

  // Límites de carga de comprobante
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "application/pdf"]
};
