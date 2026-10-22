function escapar(valor) {
  return valor.replace(/[&<>"']/g, caracter => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[caracter]));
}

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

function descomponerFecha(fechaStr) {
  if (!fechaStr) return { dia: "", mes: "", mesNombre: "", anio: "" };

  let partes = null;
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(fechaStr);
  const otroMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(fechaStr);

  if (isoMatch) {
    partes = { anio: isoMatch[1], mes: isoMatch[2], dia: isoMatch[3] };
  } else if (otroMatch) {
    partes = { dia: otroMatch[1], mes: otroMatch[2], anio: otroMatch[3] };
  }

  if (!partes) return { dia: "", mes: "", mesNombre: "", anio: "" };

  const mesIndex = parseInt(partes.mes, 10) - 1;
  const mesNombre = MESES_ES[mesIndex] || "";

  return {
    dia: partes.dia.padStart(2, "0"),
    mes: partes.mes.padStart(2, "0"),
    mesNombre,
    anio: partes.anio
  };
}


export function mostrarFichaOficial(contenedor, datos) {
  if (!contenedor) return;

  const data = Object.fromEntries(Object.entries(datos).map(([clave, valor]) => [clave,
    typeof valor === 'string' ? escapar(valor) : valor
  ]));
  data.fotoURL = /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(datos.fotoEstudiante || '') ? datos.fotoEstudiante : '';
  const fNac = descomponerFecha(data.fechaNacimiento);
  const fMat = descomponerFecha(data.fechaMatricula);
  const anioCorto = fMat.anio ? fMat.anio.slice(-1) : "";

  contenedor.innerHTML = `
    <div class="ficha-oficial">

      <div class="fo-header">
        <img src="../img/Escudo-inc.png" alt="Escudo INC" class="fo-logo">
        <div class="fo-titulo">
          <p class="fo-titulo-min">Ministerio de Educación</p>
          <p class="fo-titulo-min">Gerencia de Gestión Institucional</p>
          <h1>Ficha de Matrícula Oficial del alumno/a</h1>
          <p class="fo-titulo-min">Instituto Nacional de Comercio</p>
        </div>
        <div class="fo-foto">
          ${data.fotoURL
            ? `<img src="${data.fotoURL}" alt="Foto del estudiante" style="width:100%;height:100%;object-fit:cover;">`
            : `Foto de<br>3.5 X 2.5`}
        </div>
      </div>

      <p class="fo-texto-legal">
        Lea el formulario, antes de llenarlo, para evitar tachaduras y enmendaduras que lo invalidan y obligan
        a su reposición. Utilice tinta azul, letra de molde legible e información real. Los datos proporcionados
        son de uso estrictamente académico y de absoluta confidencialidad.
      </p>

      <p class="fo-anio"><strong>Año de Bachillerato que estudiará:</strong> <span class="fo-linea">${data.grado || ""}</span></p>

      <div class="fo-fila-top">
        <div class="fo-nie-dui">
          <p><strong>NIE:</strong> <span class="fo-linea">${data.nie || ""}</span></p>
          <p><strong>DUI:</strong> <span class="fo-linea">${data.duiEstudiante || ""}</span></p>
        </div>

        <div class="fo-sello">SELLO</div>

        <div class="fo-numero">
          <span>N°</span>
          <span class="fo-numero-valor">${data.numeroFicha || ""}</span>
        </div>
      </div>

      <p class="fo-fecha">
        San Salvador,
        <span class="fo-linea-corta">${fMat.dia || ""}</span> de
        <span class="fo-linea-corta">${fMat.mesNombre || ""}</span> de 202<span class="fo-linea-mini">${anioCorto}</span>
      </p>

      <h3 class="fo-subtitulo">Datos Generales del Estudiante según Partida de Nacimiento</h3>
      <table class="fo-tabla-nombre">
        <tr>
          <td>${data.primerApellido || ""}</td>
          <td>${data.segundoApellido || ""}</td>
          <td>${data.primerNombre || ""}</td>
          <td>${data.segundoNombre || ""}</td>
        </tr>
        <tr class="fo-tabla-labels">
          <td>Primer Apellido</td>
          <td>Segundo Apellido</td>
          <td>Primer Nombre</td>
          <td>Segundo Nombre</td>
        </tr>
      </table>

      <p>
        Lugar y fecha de nacimiento: <span class="fo-linea">${data.lugarNacimiento || ""}</span>
        Día: <span class="fo-linea-mini">${fNac.dia || ""}</span>
        Mes: <span class="fo-linea-mini">${fNac.mesNombre || ""}</span>
        Año: <span class="fo-linea-mini">${fNac.anio || ""}</span>
      </p>

      <p>
        Edad: <span class="fo-linea-mini">${data.edad || ""}</span>
        ${data.sexo ? `&nbsp;&nbsp;Sexo: <strong>${data.sexo}</strong>` : ""}
        &nbsp;&nbsp;N° de celular del estudiante <span class="fo-linea">${data.telefonoEstudiante || ""}</span>
        &nbsp;&nbsp;Grado que estudiará <span class="fo-linea">${data.grado || ""}</span>
      </p>

      <p>
        Último año aprobado <span class="fo-linea">${data.ultimoAnioAprobado || ""}</span>
        ${data.tipoIngreso ? `&nbsp;&nbsp;<strong>${data.tipoIngreso}</strong>` : ""}
        &nbsp;&nbsp;¿Dónde estudió el año anterior? <span class="fo-linea">${data.colegioAnterior || ""}</span>
      </p>

      ${(data.tipoTransporte || data.distanciaKm) ? `
      <p>
        ${data.tipoTransporte ? `Tipo de transporte que utiliza: <strong>${data.tipoTransporte}</strong>` : ""}
        ${data.distanciaKm ? `&nbsp;&nbsp;Distancia en KM <span class="fo-linea-mini">${data.distanciaKm}</span>` : ""}
      </p>` : ""}

      ${data.conQuienVive ? `
      <p>¿Con quién vive? <strong>${data.conQuienVive}</strong></p>` : ""}

      ${data.enfermedad ? `
      <p>
        ¿Padece de alguna enfermedad? <strong>${data.enfermedad}</strong>
        ${data.cualEnfermedad ? ` &nbsp;&nbsp;¿Cuál? <span class="fo-linea">${data.cualEnfermedad}</span>` : ""}
      </p>` : ""}
      ${data.medicamento ? `<p>Nombre del medicamento que utiliza: <span class="fo-linea">${data.medicamento}</span> ¿En qué dosis? <span class="fo-linea"></span></p>` : ""}
      ${data.otros ? `<p>Otros: <span class="fo-linea-larga">${data.otros}</span></p>` : ""}

      ${(data.vacunaCovid || data.zonaResidencia) ? `
      <p>
        ${data.vacunaCovid ? `Vacuna COVID-19: <strong>${data.vacunaCovid}</strong>` : ""}
        ${data.zonaResidencia ? `&nbsp;&nbsp;Zona de residencia: <strong>${data.zonaResidencia}</strong>` : ""}
      </p>` : ""}
      ${data.direccionResidencia ? `<p>Dirección de Residencia: <span class="fo-linea-larga">${data.direccionResidencia}</span></p>` : ""}

      ${(data.correoEstudiantil || data.computadoraMineducyt) ? `
      <p>
        ${data.correoEstudiantil ? `Correo electrónico MINEDUCYT <span class="fo-linea">${data.correoEstudiantil}</span>` : ""}
        ${data.computadoraMineducyt ? `&nbsp;&nbsp;Posee computadora del MINEDUCYT: <strong>${data.computadoraMineducyt}</strong>` : ""}
      </p>` : ""}
      ${(data.correoPersonal || data.internet) ? `
      <p>
        ${data.correoPersonal ? `Correo personal <span class="fo-linea">${data.correoPersonal}</span>` : ""}
        ${data.internet ? `&nbsp;&nbsp;Posee acceso a internet: <strong>${data.internet}</strong>` : ""}
      </p>` : ""}

      <p>
        Talla de camisa <span class="fo-linea-mini">${data.tallaCamisa || ""}</span>
        Pantalón <span class="fo-linea-mini">${data.tallaPantalon || ""}</span>
        Blusa <span class="fo-linea-mini">${data.tallaBlusa || ""}</span>
        Falda <span class="fo-linea-mini">${data.tallaFalda || ""}</span>
        Zapatos <span class="fo-linea-mini">${data.tallaZapatos || ""}</span>
      </p>

      ${data.hermanosCentroeducativo ? `
      <p>
        Tiene hermano/a en el Centro Escolar: <strong>${data.hermanosCentroeducativo}</strong>
        ${data.nombresHermanos ? ` &nbsp;&nbsp;Nombre: <span class="fo-linea">${data.nombresHermanos}</span>` : ""}
        ${data.nivelAcademico ? ` Nivel/Secc: <span class="fo-linea-mini">${data.nivelAcademico}</span>` : ""}
      </p>` : ""}

      <h3 class="fo-subtitulo">Bachillerato que estudiará</h3>
      <p><strong>${data.especialidad || "—"}</strong></p>

      <h3 class="fo-subtitulo">Datos del Responsable</h3>
      <p>Responsable: <span class="fo-linea-larga">${data.responsable || ""}</span></p>
      <p>
        Parentesco <span class="fo-linea">${data.parentesco || ""}</span>
        DUI <span class="fo-linea">${data.duiResponsable || ""}</span>
        TEL. <span class="fo-linea">${data.telefonoResponsable || ""}</span>
        Whatsapp <span class="fo-linea">${data.whatsappResponsable || ""}</span>
      </p>
      <p>Correo Electrónico <span class="fo-linea-larga">${data.correoResponsable || ""}</span></p>

      <table class="fo-tabla-madre-padre">
        <tr><th colspan="2">Datos de Madre - Padre</th></tr>
        <tr>
          <td>Madre: <span class="fo-linea-larga">${data.madreNombre || ""}</span></td>
          <td>Padre: <span class="fo-linea-larga">${data.padreNombre || ""}</span></td>
        </tr>
        <tr>
          <td>Ocupación: <span class="fo-linea">${data.madreOcupacion || ""}</span></td>
          <td>Ocupación: <span class="fo-linea">${data.padreOcupacion || ""}</span></td>
        </tr>
        <tr>
          <td>Lugar de trabajo: <span class="fo-linea">${data.madreLugarTrabajo || ""}</span></td>
          <td>Lugar de trabajo: <span class="fo-linea">${data.padreLugarTrabajo || ""}</span></td>
        </tr>
        <tr>
          <td>Número de DUI: <span class="fo-linea">${data.madreDui || ""}</span></td>
          <td>Número de DUI: <span class="fo-linea">${data.padreDui || ""}</span></td>
        </tr>
        <tr>
          <td>Lugar y fecha de nacimiento: <span class="fo-linea">${[data.madreLugarNacimiento, descomponerFecha(data.madreFechaNacimiento).dia && `${descomponerFecha(data.madreFechaNacimiento).dia}/${descomponerFecha(data.madreFechaNacimiento).mes}/${descomponerFecha(data.madreFechaNacimiento).anio}`].filter(Boolean).join(" — ")}</span></td>
          <td>Lugar y fecha de nacimiento: <span class="fo-linea">${[data.padreLugarNacimiento, descomponerFecha(data.padreFechaNacimiento).dia && `${descomponerFecha(data.padreFechaNacimiento).dia}/${descomponerFecha(data.padreFechaNacimiento).mes}/${descomponerFecha(data.padreFechaNacimiento).anio}`].filter(Boolean).join(" — ")}</span></td>
        </tr>
        <tr>
          <td>Número de Celular: <span class="fo-linea">${data.madreCelular || ""}</span></td>
          <td>Número de Celular: <span class="fo-linea">${data.padreCelular || ""}</span></td>
        </tr>
      </table>

      <h3 class="fo-subtitulo">Compromisos</h3>
      <ol class="fo-compromisos">
        <li>Asistir puntualmente a las convocatorias hechas por la Institución.</li>
        <li>Leer y dar cumplimiento a lo que establece el Manual de Convivencia.</li>
        <li>Cumplir con los compromisos pactados en Asamblea General de padres, madres y/o responsables.</li>
        <li>Asistir a cualquier llamado por el/la maestro/a, coordinación, subdirección o dirección de la institución.</li>
        <li>Responder por daños materiales que ocasione mi hijo/a en la Institución.</li>
        <li>Velar porque el alumno/a no pueda retirarse de la institución en horas de clase, sin la presencia de su responsable.</li>
        <li>No permitir que el alumno/a pueda traer a la institución objetos de valor que no sea material didáctico utilizado en clases.</li>
      </ol>

      <div class="fo-firmas">
        <div class="fo-firma">
          <span class="fo-linea-firma"></span>
          <p>Docente</p>
        </div>
        <div class="fo-firma">
          <span class="fo-linea-firma"></span>
          <p>Padre, madre y/o responsable</p>
        </div>
        <div class="fo-firma">
          <span class="fo-linea-firma"></span>
          <p>Estudiante</p>
        </div>
      </div>

    </div>
  `;
}
