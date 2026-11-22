'use strict';

// Creador de personaje: cada rasgo se elige por separado y se combinan todos (rostro.js arma la imagen por capas).
// La apariencia guardada es { v: 2, hair, hairColor, eyes, brows, skin, beard, nose, mark }.

// Retrato pintado para el HUD, la hoja del personaje, la lista y la vista previa.
function faceArt(input) {
  return faceImage(input, 'face-paint');
}

// Colores de muestra para los rasgos que se eligen con círculos de color.
const swatchColors = {
  hairColor: hairHexes.map((hex, index) => index === 0 ? '#2c3566' : hex),
  eyes: eyeHexes,
  skin: skinTones.map(tone => '#' + tone.map(v => v.toString(16).padStart(2, '0')).join('')),
};

let newFace = defaultFace();
function updateFacePreview() {
  const preview = document.getElementById('appearance-preview');
  if (!preview) return;
  preview.innerHTML = faceArt(newFace);
  for (const [key, , options] of faceChoices) {
    const row = document.querySelector('[data-face-row="' + key + '"]');
    if (!row) continue;
    const value = row.querySelector('.face-value');
    if (value && value.textContent !== options[newFace[key]]) value.textContent = options[newFace[key]];
    const count = row.querySelector('.face-count');
    if (count) count.textContent = (newFace[key] + 1) + '/' + options.length;
    for (const swatch of row.querySelectorAll('[data-face-pick]')) {
      const chosen = Number(swatch.dataset.facePick) === newFace[key];
      swatch.setAttribute('aria-checked', chosen);
      swatch.tabIndex = chosen ? 0 : -1;   // una sola parada de tabulación por grupo; las flechas recorren los colores
    }
  }
}
function initializeAppearance() {
  const presets = document.getElementById('appearance-presets');
  presets.innerHTML = faceChoices.map(([key, label, options]) => {
    const colors = swatchColors[key];
    const control = colors
      ? '<div class="face-swatches" role="radiogroup" aria-label="' + label + '">' + options.map((name, index) =>
        '<button type="button" role="radio" class="face-swatch" data-face-pick="' + index + '" aria-label="' + name + '" title="' + name +
        '" style="--swatch:' + colors[index] + '"></button>').join('') + '</div><span class="face-value"></span>'
      : '<div class="face-stepper" role="group" aria-label="' + label + '"><button type="button" class="face-step" data-face-step="-1" aria-label="' + label + ' anterior">‹</button>' +
        '<span class="face-value" aria-live="polite"></span><span class="face-count"></span>' +
        '<button type="button" class="face-step" data-face-step="1" aria-label="' + label + ' siguiente">›</button></div>';
    return '<div class="face-row" data-face-row="' + key + '"><span class="face-label">' + label + '</span>' + control + '</div>';
  }).join('');
  const choose = event => {
    const row = event.target.closest('[data-face-row]');
    const key = row?.dataset.faceRow;
    const options = key && faceChoices.find(choice => choice[0] === key)[2];
    const step = event.target.closest('[data-face-step]');
    const pick = event.target.closest('[data-face-pick]');
    if (step) newFace[key] = (newFace[key] + Number(step.dataset.faceStep) + options.length) % options.length;
    else if (pick) newFace[key] = Number(pick.dataset.facePick);
    else if (event.target.closest('[data-face-random]')) {
      for (const [k, , opts] of faceChoices) newFace[k] = Math.floor(Math.random() * opts.length);
      // Al azar, la mitad de las veces sin barba ni marcas, para que no salgan todos iguales de cargados.
      if (Math.random() < .5) newFace.beard = 0;
      if (Math.random() < .6) newFace.mark = 0;
    } else return;
    updateFacePreview();
  };
  presets.addEventListener('click', choose);
  document.querySelector('[data-face-random]').addEventListener('click', choose);
  // Flechas dentro de un grupo de colores, como en un grupo de radios.
  presets.addEventListener('keydown', event => {
    const swatch = event.target.closest('[data-face-pick]');
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!swatch || !step) return;
    event.preventDefault();
    const key = swatch.closest('[data-face-row]').dataset.faceRow;
    const count = faceChoices.find(choice => choice[0] === key)[2].length;
    newFace[key] = (newFace[key] + step + count) % count;
    updateFacePreview();
    swatch.parentElement.querySelector('[aria-checked="true"]').focus();
  });
  updateFacePreview();
}
// Cuando termina de cargar el atlas de capas se redibujan los retratos que estaban esperando.
faceAtlasReady.then(() => {
  updateFacePreview();
  if (typeof refreshPortraits === 'function') refreshPortraits();
});
