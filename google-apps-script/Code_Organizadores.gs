/**
 * ==========================================================================
 * GOOGLE APPS SCRIPT — PLANILLA SEPARADA DE ORGANIZADORES (CAMPA JUVE 2027)
 * ==========================================================================
 * Instrucciones:
 * 1. Creá una planilla de Google Sheets EXCLUSIVA para Organizadores 2027.
 * 2. Andá a Extensiones > Apps Script y pegá este código.
 * 3. (Opcional) Pegá el ID de una carpeta de Google Drive en DRIVE_FOLDER_ID.
 * 4. Implementar > Nueva implementación > Aplicación web:
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 5. Copiá la URL generada y pegala en `ORGANIZADORES_SCRIPT_URL` dentro de `js/config.js`.
 */

const SHEET_NAME = "Organizadores 2027";
const SHEET_SEGUNDA_CUOTA = "Segunda Cuota Organizadores 2027";
const DRIVE_FOLDER_ID = ""; // Opcional: ID de carpeta en Google Drive para guardar comprobantes

const HEADERS = [
  "Tipo de Envío",
  "Rol",
  "Equipo de Organización",
  "Código de Inscripción",
  "Fecha de Registro",
  "Apellido y nombre",
  "Fecha de nacimiento",
  "Edad",
  "DNI",
  "Número de teléfono personal",
  "Apellido y nombre de padre/madre/tutor",
  "Número de padre/madre/tutor",
  "Parroquia que pertenece",
  "Localidad",
  "¿Participaste de algún CampaJuve?",
  "Obra social y número de afiliado",
  "¿Es alérgico a algo? ¿A qué?",
  "Alimentación especial",
  "¿Tratamiento médico o medicación diaria?",
  "Modalidad de Pago",
  "Detalle Beca / Solidario",
  "Nombre de Comprobante",
  "Enlace Comprobante (Drive)"
];

const HEADERS_SEGUNDA_CUOTA = [
  "Tipo de Envío",
  "Rol",
  "Fecha de Registro",
  "Código de Inscripción",
  "Apellido y nombre",
  "DNI",
  "Modalidad de Pago",
  "Nombre de Comprobante (2.ª cuota)",
  "Enlace Comprobante (Drive)"
];

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(rawBody);
    const tipoEnvio = data.tipoEnvio || "inscripcion_inicial";
    const rol = data.rol || "organizador";

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let fileUrl = "";
    if (DRIVE_FOLDER_ID && data.comprobanteBase64 && data.comprobanteNombre) {
      try {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const decoded = Utilities.base64Decode(data.comprobanteBase64);
        const prefix = tipoEnvio === "segunda_cuota" ? `ORG_CUOTA2_${data.dni || "SIN_DNI"}` : `ORG_${data.codigoInscripcion || "CJ27"}`;
        const safeName = `${prefix}_${data.comprobanteNombre}`;
        const blob = Utilities.newBlob(decoded, data.comprobanteTipo || "application/octet-stream", safeName);
        const savedFile = folder.createFile(blob);
        fileUrl = savedFile.getUrl();
      } catch (driveErr) {
        fileUrl = "Error al guardar en Drive: " + driveErr.message;
      }
    }

    if (tipoEnvio === "segunda_cuota") {
      let sheetC2 = ss.getSheetByName(SHEET_SEGUNDA_CUOTA);
      if (!sheetC2) sheetC2 = ss.insertSheet(SHEET_SEGUNDA_CUOTA);

      if (sheetC2.getLastRow() === 0) {
        sheetC2.appendRow(HEADERS_SEGUNDA_CUOTA);
        sheetC2.getRange(1, 1, 1, HEADERS_SEGUNDA_CUOTA.length)
          .setFontWeight("bold")
          .setBackground("#336699")
          .setFontColor("#FFFFFF");
        sheetC2.setFrozenRows(1);
      }

      sheetC2.appendRow([
        tipoEnvio,
        rol,
        data.fechaRegistro || new Date().toISOString(),
        data.codigoInscripcion || "",
        data.nombreCompleto || "",
        data.dni || "",
        data.modalidadPago || "2.ª cuota (enero 2027)",
        data.comprobanteNombre || "",
        fileUrl
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", rol: rol, tipoEnvio: "segunda_cuota" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight("bold")
        .setBackground("#08223B")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      tipoEnvio,
      rol,
      data.equipoOrganizador || "",
      data.codigoInscripcion || "",
      data.fechaRegistro || new Date().toISOString(),
      data.nombreCompleto || "",
      data.fechaNacimiento || "",
      data.edad || "",
      data.dni || "",
      data.telefono || "",
      data.tutorNombre || "",
      data.tutorTelefono || "",
      data.parroquia || "",
      data.localidad || "",
      data.participoCampa || "",
      data.obraSocialAfiliado || "",
      data.alergias || "",
      data.alimentacionEspecial || "",
      data.tratamientoMedicacion || "",
      data.modalidadPago || "",
      data.becaDetalle || "",
      data.comprobanteNombre || "",
      fileUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", rol: rol, tipoEnvio: "inscripcion_inicial", codigo: data.codigoInscripcion }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ready", service: "Campa Juve 2027 Organizadores API" }))
    .setMimeType(ContentService.MimeType.JSON);
}
