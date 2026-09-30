const form = document.querySelector('#inscripcion');
const campoSede = document.querySelector('#campo-sede');
const confirmacion = document.querySelector('#confirmacion');
const fuerza = document.querySelector('#clave-fuerza');
const contador = document.querySelector('#comentarios-contador');
const tocados = new Set();

//Fecha maxima para el calculo de fecha de nacimiento
form.nacimiento.max = new Date().toISOString().slice(0, 10);
//-------------------------------------------------------------------------------------
//Aviso de la contraseña 
function faltantesClave(v) {
  const falta = [];
  if (v.length < 8) falta.push('8 caracteres como mínimo');
  if (!/[A-Z]/.test(v)) falta.push('una mayúscula');
  if (!/[a-z]/.test(v)) falta.push('una minúscula');
  if (!/\d/.test(v)) falta.push('un número');
  if (!/[^\p{L}\d\s]/u.test(v)) falta.push('un símbolo');
  return falta;
}

function unirLista(lista) {
  if (lista.length < 2) return lista.join('');
  return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
}

//Calcular edad del usuario
function calcularEdad(fecha) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const mes = hoy.getMonth() - fecha.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) edad--;
  return edad;
}

//Reglas dle forms
const reglas = {
  nombre: v => {
    const t = v.trim().replace(/\s+/g, ' ');
    const palabras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/;
    return (t.length >= 5 && t.length <= 60 && palabras.test(t))
      || 'Escribe tu nombre y apellido.';
  },
  cedula: v => /^([1-9]|1[0-3]|PE|E|N)-\d{1,4}-\d{1,6}$/.test(v.trim().toUpperCase())
    || 'Usa el formato 8-123-4567.',
  correo: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    || 'Usa un correo como nombre@dominio.com.',
  celular: v => /^6\d{3}-?\d{4}$/.test(v.trim())
    || 'El celular debe tener 8 dígitos y empezar con 6.',
  nacimiento: v => {
    if (!v) return 'Debes tener al menos 16 años.';
    const fecha = new Date(v + 'T00:00:00');
    if (fecha > new Date()) return 'La fecha no puede ser futura.';
    return calcularEdad(fecha) >= 16 || 'Debes tener al menos 16 años.';
  },
  curso: v => v !== '' || 'Elige un curso.',
  modalidad: () => form.modalidad.value !== '' || 'Elige una modalidad.',
  sede: v => form.modalidad.value !== 'presencial' || v !== '' || 'Elige una sede.',
  clave: v => {
    const falta = faltantesClave(v);
    return falta.length === 0 || 'Te falta: ' + unirLista(falta) + '.';
  },
  clave2: v => (v !== '' && v === form.clave.value) || 'Las contraseñas no coinciden.',
  comentarios: v => v.length <= 200 || 'Máximo 200 caracteres.',
  terminos: () => form.terminos.checked || 'Debes aceptar los términos.',
};

//Validar que cumpla las reglas
function validarCampo(input) {
  const resultado = reglas[input.name](input.value);
  const valido = resultado === true;
  const error = document.getElementById(`${input.name}-error`);

  //Los radios comparten name (se marcan todos los del grupo) (ermano esto que es, ELIMINA EL COMENTARIO)
  const controles = input.type === 'radio'
    ? form.querySelectorAll(`input[name="${input.name}"]`)
    : [input];
  controles.forEach(c => c.setAttribute('aria-invalid', String(!valido)));

  error.textContent = valido ? '' : resultado;
  return valido;
}

//Seleccion de la sede
function actualizarSede() {
  const presencial = form.modalidad.value === 'presencial';
  campoSede.hidden = !presencial;
  if (!presencial) {
    // Oculta y deja de validarse: se limpia valor, estado y error
    form.sede.value = '';
    form.sede.removeAttribute('aria-invalid');
    document.getElementById('sede-error').textContent = '';
    tocados.delete('sede');
  }
}

//Que tan fuerte es tu contraseña
function actualizarFuerza() {
  const v = form.clave.value;
  const cumplidos = 5 - faltantesClave(v).length;
  let nivel = 'vacia';
  let texto = '—';
  if (v !== '') {
    if (cumplidos <= 2) { nivel = 'debil'; texto = 'débil'; }
    else if (cumplidos <= 4) { nivel = 'media'; texto = 'media'; }
    else { nivel = 'fuerte'; texto = 'fuerte'; }
  }
  fuerza.dataset.nivel = nivel;
  fuerza.querySelector('.fuerza-texto').textContent = 'Fuerza: ' + texto;
}

//Para el limite de caracteria en comentarios
function actualizarContador() {
  const n = form.comentarios.value.length;
  contador.textContent = `${n}/200`;
  contador.classList.toggle('contador-alerta', n > 180);
}

//Aviso de errores
form.addEventListener('blur', (e) => {
  if (!reglas[e.target.name]) return;
  tocados.add(e.target.name);
  validarCampo(e.target);
}, true);   // true = fase de captura (blur no burbujea)

form.addEventListener('input', (e) => {
  const nombre = e.target.name;

  if (nombre === 'modalidad') actualizarSede();
  if (nombre === 'clave') {
    actualizarFuerza();
    // Al cambiar la contraseña se revalida la confirmación
    if (tocados.has('clave2')) validarCampo(form.clave2);
  }
  if (nombre === 'comentarios') actualizarContador();

  if (tocados.has(nombre)) validarCampo(e.target);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const campos = [...form.elements].filter(el => reglas[el.name]);
  campos.forEach(el => tocados.add(el.name));
  const invalidos = campos.filter(el => !validarCampo(el));
  if (invalidos.length) { invalidos[0].focus(); return; }

  mostrarResumen(new FormData(form));
  form.reset();
  reiniciarEstado();
});

//Confirmacion (solo va aparecer si todo se cumple)
function mostrarResumen(datos) {
  const filas = [
    ['Nombre', datos.get('nombre').trim()],
    ['Cédula', datos.get('cedula').trim().toUpperCase()],
    ['Correo', datos.get('correo').trim()],
    ['Celular', datos.get('celular').trim()],
    ['Nacimiento', datos.get('nacimiento')],
    ['Curso', datos.get('curso')],
    ['Modalidad', datos.get('modalidad')],
  ];
  if (datos.get('modalidad') === 'presencial') filas.push(['Sede', datos.get('sede')]);
  if (datos.get('comentarios').trim() !== '') {
    filas.push(['Comentarios', datos.get('comentarios').trim()]);
  }

  const tarjeta = document.createElement('article');
  tarjeta.className = 'card';

  const titulo = document.createElement('h3');
  titulo.textContent = '¡Inscripción registrada!';
  tarjeta.append(titulo);

  for (const [etiqueta, valor] of filas) {
    const p = document.createElement('p');
    p.className = 'dato';
    const negrita = document.createElement('strong');
    negrita.textContent = etiqueta + ': ';
    const texto = document.createElement('span');
    texto.textContent = valor;             // textContent, nunca innerHTML
    p.append(negrita, texto);
    tarjeta.append(p);
  }

  confirmacion.replaceChildren(tarjeta);
}

//Reinicia el form
function reiniciarEstado() {
  tocados.clear();
  [...form.elements].filter(el => reglas[el.name]).forEach(el => {
    el.removeAttribute('aria-invalid');
    document.getElementById(`${el.name}-error`).textContent = '';
  });
  actualizarSede();
  actualizarFuerza();
  actualizarContador();
}