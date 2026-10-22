// buscador-nacimiento.js

const lugaresElSalvador = [
  // DEPARTAMENTO DE AHUACHAPÁN
  "Ahuachapán - Ahuachapán Centro", "Apaneca - Ahuachapán Centro", "Ataco - Ahuachapán Centro", "Concepción de Ataco - Ahuachapán Centro", "Tacuba - Ahuachapán Centro",
  "San Francisco Menéndez - Ahuachapán Norte", "Jujutla - Ahuachapán Norte", "Guaymango - Ahuachapán Norte", "San Pedro Puxtla - Ahuachapán Norte",
  "Atiquizaya - Ahuachapán Sur", "El Refugio - Ahuachapán Sur", "San Lorenzo - Ahuachapán Sur", "Turín - Ahuachapán Sur",
  
  // DEPARTAMENTO DE SANTA ANA
  "Santa Ana - Santa Ana Centro", "Coatepeque - Santa Ana Este", "El Congo - Santa Ana Este",
  "Masahuat - Santa Ana Norte", "Metapán - Santa Ana Norte", "Santa Rosa Guachipilín - Santa Ana Norte", "Texistepeque - Santa Ana Norte",
  "Candelaria de la Frontera - Santa Ana Oeste", "Chalchuapa - Santa Ana Oeste", "El Porvenir - Santa Ana Oeste", "San Antonio Pajonal - Santa Ana Oeste", "San Sebastián Salitrillo - Santa Ana Oeste", "Santiago de la Frontera - Santa Ana Oeste",

  // DEPARTAMENTO DE SONSONATE
  "Sonsonate - Sonsonate Centro", "Nahuizalco - Sonsonate Centro", "San Antonio del Monte - Sonsonate Centro",
  "Acajutla - Sonsonate Este", "Salcoatitán - Sonsonate Este", "Juayúa - Sonsonate Este", "Santa Catarina Masahuat - Sonsonate Este",
  "Armenia - Sonsonate Norte", "Caluco - Sonsonate Norte", "Cuisnahuat - Sonsonate Norte", "Izalco - Sonsonate Norte", "San Julián - Sonsonate Norte", "Santa Isabel Ishuatán - Sonsonate Norte",
  "Santo Domingo de Guzmán - Sonsonate Oeste", "Sonzacate - Sonsonate Oeste",

  // DEPARTAMENTO DE CHALATENANGO
  "Chalatenango - Chalatenango Centro", "Agua Caliente - Chalatenango Centro", "Dulce Nombre de María - Chalatenango Centro", "El Paraíso - Chalatenango Centro", "La Reina - Chalatenango Centro", "San Fernando - Chalatenango Centro", "San Francisco Morazán - Chalatenango Centro", "San Rafael - Chalatenango Centro", "Santa Rita - Chalatenango Centro", "Tejutla - Chalatenango Centro",
  "Citalá - Chalatenango Norte", "La Palma - Chalatenango Norte", "San Ignacio - Chalatenango Norte",
  "Arcatao - Chalatenango Sur", "Azacualpa - Chalatenango Sur", "Comalapa - Chalatenango Sur", "Concepción Quezaltepeque - Chalatenango Sur", "El Carrizal - Chalatenango Sur", "La Laguna - Chalatenango Sur", "Las Vueltas - Chalatenango Sur", "Nombre de Jesús - Chalatenango Sur", "Nueva Concepción - Chalatenango Sur", "Nueva Trinidad - Chalatenango Sur", "Ojos de Agua - Chalatenango Sur", "Potonico - Chalatenango Sur", "San Antonio de la Cruz - Chalatenango Sur", "San Antonio Los Ranchos - Chalatenango Sur", "San Isidro Labrador - Chalatenango Sur", "San José Cancasque - Chalatenango Sur", "San José Las Flores - Chalatenango Sur", "San Luis del Carmen - Chalatenango Sur", "San Miguel de Mercedes - Chalatenango Sur",

  // DEPARTAMENTO DE CUSCATLÁN
  "Cojutepeque - Cuscatlán Norte", "Candelaria - Cuscatlán Norte", "El Carmen - Cuscatlán Norte", "El Rosario - Cuscatlán Norte", "Monte San Juan - Cuscatlán Norte", "Oratorio de Concepción - Cuscatlán Norte", "San Bartolomé Perulapía - Cuscatlán Norte", "San Cristóbal - Cuscatlán Norte", "San José Guayabal - Cuscatlán Norte", "San Pedro Perulapán - Cuscatlán Norte", "San Rafael Cedros - Cuscatlán Norte", "Santa Cruz Analquito - Cuscatlán Norte", "Santa Cruz Michapa - Cuscatlán Norte", "Suchitoto - Cuscatlán Norte", "Tenancingo - Cuscatlán Norte",
  "Cuscatlán - Cuscatlán Sur", "El Carmen - Cuscatlán Sur", "San Rafael Cedros - Cuscatlán Sur", "Santa Cruz Michapa - Cuscatlán Sur",

  // DEPARTAMENTO DE LA LIBERTAD
  "Santa Tecla - La Libertad Sur", "Comasagua - La Libertad Sur",
  "Antiguo Cuscatlán - La Libertad Este", "Nuevo Cuscatlán - La Libertad Este", "San José Villanueva - La Libertad Este", "Zaragoza - La Libertad Este", "Huizúcar - La Libertad Este",
  "Quezaltepeque - La Libertad Norte", "San Matías - La Libertad Norte", "San Pablo Tacachico - La Libertad Norte",
  "San Juan Opico - La Libertad Centro", "Ciudad Arce - La Libertad Centro",
  "Colón - La Libertad Oeste", "Jayaque - La Libertad Oeste", "Sacacoyo - La Libertad Oeste", "Tepecoyo - La Libertad Oeste", "Talnique - La Libertad Oeste",
  "Chiltiupán - La Libertad Costa", "Jicalapa - La Libertad Costa", "La Libertad - La Libertad Costa", "Tamanique - La Libertad Costa", "Teotepeque - La Libertad Costa",

  // DEPARTAMENTO DE SAN SALVADOR
  "San Salvador - San Salvador Centro", "Ayutuxtepeque - San Salvador Centro", "Mejicanos - San Salvador Centro", "Cuscatancingo - San Salvador Centro", "Ciudad Delgado - San Salvador Centro",
  "Aguilares - San Salvador Norte", "El Paisnal - San Salvador Norte", "Guazapa - San Salvador Norte",
  "Apopa - San Salvador Oeste", "Nejapa - San Salvador Oeste",
  "Ilopango - San Salvador Este", "San Martín - San Salvador Este", "Soyapango - San Salvador Este", "Tonacatepeque - San Salvador Este",
  "Panchimalco - San Salvador Sur", "Rosario de Mora - San Salvador Sur", "San Marcos - San Salvador Sur", "Santo Tomás - San Salvador Sur", "Santiago Texacuangos - San Salvador Sur",

  // DEPARTAMENTO DE LA PAZ
  "Zacatecoluca - La Paz Centro", "San Juan Nonualco - La Paz Centro", "San Rafael Obrajuelo - La Paz Centro", "Santa María Ostuma - La Paz Centro", "San Pedro Nonualco - La Paz Centro",
  "Olocuilta - La Paz Este", "San Juan Talpa - La Paz Este", "San Luis Talpa - La Paz Este", "San Miguel Tepezontes - La Paz Este", "San Francisco Chinameca - La Paz Este", "Cuyultitán - La Paz Este", "El Rosario - La Paz Este", "Jerusalén - La Paz Este", "Paraíso de Osorio - La Paz Este", "San Antonio Masahuat - La Paz Este", "San Emigdio - La Paz Este", "San Juan Tepezontes - La Paz Este", "San Pedro Masahuat - La Paz Este", "Tapalhuaca - La Paz Este",
  "Santiago Nonualco - La Paz Oeste", "San Juan Nonualco - La Paz Oeste", "San Rafael Obrajuelo - La Paz Oeste",

  // DEPARTAMENTO DE CABAÑAS
  "Sensuntepeque - Cabañas Este", "Dolores - Cabañas Este", "Guacotecti - Cabañas Este", "San Isidro - Cabañas Este", "Victoria - Cabañas Este",
  "Ilobasco - Cabañas Oeste", "Cinquera - Cabañas Oeste", "Jutiapa - Cabañas Oeste", "Tejutepeque - Cabañas Oeste",

  // DEPARTAMENTO DE SAN VICENTE
  "San Vicente - San Vicente Norte", "Apastepeque - San Vicente Norte", "Santa Clara - San Vicente Norte", "San Ildefonso - San Vicente Norte", "San Esteban Catarina - San Vicente Norte", "San Lorenzo - San Vicente Norte", "San Sebastián - San Vicente Norte", "Santo Domingo - San Vicente Norte",
  "Tecoluca - San Vicente Sur", "San Cayetano Istepeque - San Vicente Sur", "Tepetitán - San Vicente Sur", "Verapaz - San Vicente Sur", "Guadalupe - San Vicente Sur",

  // DEPARTAMENTO DE USULUTÁN
  "Usulután - Usulután Norte", "Jucuapa - Usulután Norte", "Nueva Guadalupe - Usulután Norte", "Santa Elena - Usulután Norte", "Santiago de María - Usulután Norte", "Alegría - Usulután Norte", "Berlín - Usulután Norte", "California - Usulután Norte", "Concepción Batres - Usulután Norte", "Ereguayquín - Usulután Norte", "Jucuarán - Usulután Norte", "Ozatlán - Usulután Norte", "San Dionisio - Usulután Norte", "Santa María - Usulután Norte", "Tecapán - Usulután Norte",
  "Jiquilisco - Usulután Oeste", "Puerto El Triunfo - Usulután Oeste", "San Agustín - Usulután Oeste", "San Francisco Javier - Usulután Oeste",

  // DEPARTAMENTO DE SAN MIGUEL
  "San Miguel - San Miguel Centro", "Comacarán - San Miguel Centro", "Uluazapa - San Miguel Centro", "Moncagua - San Miguel Centro", "Quelepa - San Miguel Centro", "Chirilagua - San Miguel Centro",
  "Ciudad Barrios - San Miguel Norte", "Sesori - San Miguel Norte", "Nuevo Edén de San Juan - San Miguel Norte", "San Gerardo - San Miguel Norte", "San Luis de La Reina - San Miguel Norte", "Carolina - San Miguel Norte", "San Antonio del Mosco - San Miguel Norte", "Chapeltique - San Miguel Norte",
  "Chinameca - San Miguel Oeste", "Nueva Guadalupe - San Miguel Oeste", "Lolotique - San Miguel Oeste", "San Jorge - San Miguel Oeste", "San Rafael Oriente - San Miguel Oeste", "El Tránsito - San Miguel Oeste",

  // DEPARTAMENTO DE MORAZÁN
  "San Francisco Gotera - Morazán Norte", "Cacaopera - Morazán Norte", "Corinto - Morazán Norte", "El Rosario - Morazán Norte", "Jocoaitique - Morazán Norte", "Meanguera - Morazán Norte", "Perquín - Morazán Norte", "San Fernando - Morazán Norte", "Torola - Morazán Norte",
  "Arambala - Morazán Sur", "Cacaopera - Morazán Sur", "Chilanga - Morazán Sur", "Delicias de Concepción - Morazán Sur", "El Divisadero - Morazán Sur", "Gualococti - Morazán Sur", "Guatajiagua - Morazán Sur", "Joateca - Morazán Sur", "Jocoro - Morazán Sur", "Lolotiquillo - Morazán Sur", "Osicala - Morazán Sur", "San Carlos - Morazán Sur", "San Isidro - Morazán Sur", "San Simón - Morazán Sur", "Sensembra - Morazán Sur", "Sociedad - Morazán Sur", "Yamabal - Morazán Sur", "Yoloaiquín - Morazán Sur",

  // DEPARTAMENTO DE LA UNIÓN
  "La Unión - La Unión Norte", "Anamorós - La Unión Norte", "Bolívar - La Unión Norte", "Concepción de Oriente - La Unión Norte", "El Sauce - La Unión Norte", "Lislique - La Unión Norte", "Nueva Esparta - La Unión Norte", "Pasaquina - La Unión Norte", "Polorós - La Unión Norte", "San José La Fuente - La Unión Norte", "Santa Rosa de Lima - La Unión Norte",
  "Conchagua - La Unión Sur", "El Carmen - La Unión Sur", "Intipucá - La Unión Sur", "La Unión - La Unión Sur", "Meanguera del Golfo - La Unión Sur", "San Alejo - La Unión Sur", "Yayantique - La Unión Sur", "Yucuaiquín - La Unión Sur"
];

export function iniciarBuscadorNacimiento() {
  const input = document.getElementById("lugarNacimiento");
  if (!input) return;

  const contenedor = input.closest('.campo');
  if (!contenedor) return;

  // Aseguramos que el contenedor sea relativo para que la lista flote correctamente
  contenedor.style.position = 'relative';

  // Crear el contenedor de la lista de sugerencias
  let lista = contenedor.querySelector('.lista-sugerencias');
  if (!lista) {
    lista = document.createElement('div');
    lista.className = 'lista-sugerencias';
    
    // --- DISEÑO MEJORADO Y LLAMATIVO ---
    lista.style.position = 'absolute';
    lista.style.top = 'calc(100% + 6px)';
    lista.style.left = '0';
    lista.style.right = '0';
    lista.style.backgroundColor = '#ffffff'; 
    lista.style.border = '2px solid #3b82f6'; // Borde azul llamativo
    lista.style.borderRadius = '10px';
    lista.style.maxHeight = '240px';
    lista.style.overflowY = 'auto';
    lista.style.zIndex = '9999';
    lista.style.display = 'none';
    lista.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)'; // Sombra más pronunciada
    lista.style.marginTop = '2px';
    lista.style.padding = '5px 0'; // Espaciado interno
    
    contenedor.appendChild(lista);
  }

  input.addEventListener("input", function() {
    const valor = this.value.toLowerCase().trim();
    lista.innerHTML = '';

    if (valor.length < 1) {
      lista.style.display = 'none';
      return;
    }

    const filtrados = lugaresElSalvador.filter(lugar =>
      lugar.toLowerCase().includes(valor)
    );

    if (filtrados.length === 0) {
      lista.style.display = 'none';
      return;
    }

    filtrados.forEach(lugar => {
      const item = document.createElement('div');
      item.className = 'item-sugerencia';
      
      // Usamos un emoji de pin para hacerlo más visual
      item.innerHTML = `<span style="margin-right: 8px;">📍</span>${lugar}`;
      
      // --- ESTILOS DEL ITEM LLAMATIVOS ---
      item.style.padding = '12px 16px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '15px';
      item.style.fontWeight = '600'; // Texto en negrita
      item.style.color = '#1e293b'; // Color de texto oscuro y legible
      item.style.backgroundColor = '#ffffff';
      item.style.transition = 'all 0.2s ease';
      item.style.borderBottom = '1px solid #f1f5f9';
      
      // Efecto Hover llamativo (Fondo azul suave, texto azul oscuro)
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#eff6ff';
        item.style.color = '#1d4ed8';
        item.style.paddingLeft = '20px'; // Pequeña animación de desplazamiento
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = '#ffffff';
        item.style.color = '#1e293b';
        item.style.paddingLeft = '16px';
      });

      // Al hacer clic, seleccionamos el lugar
      item.addEventListener('click', () => {
        input.value = lugar;
        lista.style.display = 'none';
        
        // Forzamos la validación para quitar el borde rojo
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true })); 
      });
      
      // Quitar el borde inferior al último elemento
      if (filtrados.indexOf(lugar) === filtrados.length - 1) {
        item.style.borderBottom = 'none';
      }
      
      lista.appendChild(item);
    });

    lista.style.display = 'block';
  });

  // Ocultar lista al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!input.contains(e.target) && !lista.contains(e.target)) {
      lista.style.display = 'none';
    }
  });
}

export function validarLugarNacimiento(input) {
  const valor = input.value.trim();
  if (!valor) {
    return "El lugar de nacimiento es obligatorio.";
  }
  // Validar que el texto coincida exactamente con uno de la lista
  const existe = lugaresElSalvador.some(lugar => lugar.toLowerCase() === valor.toLowerCase());
  if (!existe) {
    return "Por favor, seleccione un lugar válido de la lista.";
  }
  return ""; // Retorna vacío si es válido
}