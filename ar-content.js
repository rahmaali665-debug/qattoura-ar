/* Shared content for the Qattoura AR card (evaporation).
   Card space: the card is 1 unit wide, x = right, y = towards the top of the picture, z = up out of the card. */

/* Arabic text drawn on a canvas, because A-Frame's own text cannot shape Arabic. Use | for a new line. */
AFRAME.registerComponent('ar-text', {
  schema: {
    value: { type: 'string', default: '' },
    width: { type: 'number', default: 0.4 },
    size: { type: 'number', default: 64 },
    color: { type: 'string', default: '#12324d' },
    bg: { type: 'string', default: 'rgba(255,255,255,0.94)' },
    border: { type: 'string', default: '' }
  },
  update: function () {
    var d = this.data, W = 1024, pad = 52, font = 'Tahoma, "Segoe UI", Arial, sans-serif';
    var c = document.createElement('canvas'), ctx = c.getContext('2d');
    var lineH = Math.round(d.size * 1.5);
    ctx.font = 'bold ' + d.size + 'px ' + font;
    var lines = [];
    d.value.split('|').forEach(function (para) {
      var cur = '';
      para.trim().split(/\s+/).forEach(function (w) {
        var t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width > W - pad * 2 && cur) { lines.push(cur); cur = w; } else { cur = t; }
      });
      lines.push(cur);
    });
    var H = pad * 2 + lines.length * lineH;
    c.width = W; c.height = H;
    var r = 60;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(W - r, 0); ctx.quadraticCurveTo(W, 0, W, r);
    ctx.lineTo(W, H - r); ctx.quadraticCurveTo(W, H, W - r, H);
    ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath();
    ctx.fillStyle = d.bg; ctx.fill();
    if (d.border) { ctx.lineWidth = 14; ctx.strokeStyle = d.border; ctx.stroke(); }
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + d.size + 'px ' + font; ctx.fillStyle = d.color;
    var y = pad;
    lines.forEach(function (l) { ctx.fillText(l, W / 2, y + lineH / 2); y += lineH; });
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    if (THREE.SRGBColorSpace) { tex.colorSpace = THREE.SRGBColorSpace; }
    var old = this.el.getObject3D('mesh');
    if (old) { old.geometry.dispose(); old.material.map.dispose(); old.material.dispose(); }
    this.el.setObject3D('mesh', new THREE.Mesh(
      new THREE.PlaneGeometry(d.width, d.width * H / W),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    ));
  },
  remove: function () { this.el.removeObject3D('mesh'); }
});

/* Lets a loaded GLB model fade: sets the opacity of all its materials. */
AFRAME.registerComponent('model-opacity', {
  schema: { type: 'number', default: 1 },
  init: function () {
    this.apply = this.apply.bind(this);
    this.el.addEventListener('model-loaded', this.apply);
  },
  update: function () { this.apply(); },
  apply: function () {
    var mesh = this.el.getObject3D('mesh'), o = this.data;
    if (!mesh) { return; }
    mesh.traverse(function (n) {
      if (n.isMesh && n.material) {
        n.material.transparent = true;
        n.material.depthWrite = false;
        n.material.opacity = o;
      }
    });
  }
});

/* Builds the evaporation story inside the given parent entity and returns { play, reset }.
   Order: the sun, the red heat arrows pointing at the sea, Qattoura, Qattoura rising with the
   blue arrows while turning into vapour, and last the cloud. */
function buildQattouraCard(parent) {
  function add(html) { parent.insertAdjacentHTML('beforeend', html); }
  function $(id) { return parent.querySelector('#' + id); }
  function vis(id, on) { var e = $(id); e.setAttribute('visible', on); e.object3D.visible = on; }

  add('<a-entity light="type: ambient; intensity: 1.0; color: #ffffff"></a-entity>');
  add('<a-entity light="type: directional; intensity: 1.1; color: #fff3d0" position="-0.4 -0.6 1"></a-entity>');

  // 1. The sun
  add('<a-entity id="q-sun" visible="false" position="-0.33 0.16 0.46" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-sun" scale="0.082 0.082 0.082" animation-mixer="clip: *; loop: repeat"' +
        ' animation="property: position; from: 0 0 0; to: 0 0.02 0; dur: 1800; dir: alternate; loop: true; easing: easeInOutSine"></a-entity>' +
      '</a-entity>');

  // 2. Red heat arrows, from the sun down to the sea
  add('<a-entity id="q-heat" visible="false" position="-0.24 0.06 0.32" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-heat" scale="0.105 0.105 0.105" rotation="-12 0 -14" animation-mixer="clip: *; loop: repeat"></a-entity>' +
      '</a-entity>');

  // 3. Qattoura, the water drop
  add('<a-entity id="q-drop" visible="false" position="-0.13 -0.1 0.12" rotation="90 0 0">' +
        '<a-entity id="q-drop-model" gltf-model="#m-drop" scale="0.1 0.1 0.1" rotation="0 12 0" model-opacity="1" animation-mixer="clip: *; loop: repeat"></a-entity>' +
      '</a-entity>');

  // 4. Faint vapour and the blue arrows that show the direction: upward
  add('<a-entity id="q-vapour" visible="false">' +
    [[0.14, -0.02, 0, 1.0], [0.27, 0.05, 900, 1.25], [0.39, -0.04, 1800, 0.9], [-0.1, -0.06, 500, 0.8]].map(function (w) {
      return '<a-entity position="' + w[0] + ' ' + w[1] + ' 0.02" rotation="90 0 0">' +
          '<a-entity gltf-model="#m-wisp" scale="' + (0.15 * w[3]) + ' ' + (0.17 * w[3]) + ' ' + (0.15 * w[3]) + '" model-opacity="0"' +
          ' animation__rise="property: position; from: 0 0 0; to: 0 0.26 0; dur: 3600; delay: ' + w[2] + '; loop: true; easing: linear"' +
          ' animation__in="property: model-opacity; from: 0; to: 0.6; dur: 1200; delay: ' + w[2] + '; loop: true; easing: easeOutQuad"' +
          ' animation__out="property: model-opacity; from: 0.6; to: 0; dur: 2400; delay: ' + (w[2] + 1200) + '; loop: true; easing: easeInQuad"></a-entity>' +
        '</a-entity>';
    }).join('') + '</a-entity>');
  add('<a-entity id="q-up" visible="false" position="0.06 -0.04 0.16" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-up" scale="0.14 0.14 0.14" model-opacity="0.9"' +
        ' animation__rise="property: position; from: 0 0 0; to: 0 0.22 0; dur: 2200; loop: true; easing: easeInOutSine"' +
        ' animation__fade="property: model-opacity; from: 0.95; to: 0.15; dur: 2200; loop: true; easing: easeInQuad"></a-entity>' +
      '</a-entity>');

  // 5. The cloud, last
  add('<a-entity id="q-cloud" visible="false" position="0.04 0.16 0.8" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-cloud" scale="0.15 0.15 0.15"' +
        ' animation="property: position; from: -0.02 0 0; to: 0.02 0 0; dur: 5000; dir: alternate; loop: true; easing: easeInOutSine"></a-entity>' +
      '</a-entity>');

  // Arabic labels, tilted back so they can be read from the front and from above
  add('<a-entity id="q-title" position="0.36 0.3 0.5" rotation="65 0 0" ar-text="value: التبخر; width: 0.26; size: 150; bg: rgba(11,111,184,0.96); color: #ffffff"></a-entity>');
  add('<a-entity id="q-label-sun" visible="false" position="-0.34 -0.02 0.74" rotation="65 0 0" ar-text="value: الشمس تسخّن|ماء البحر; width: 0.3; size: 96; bg: rgba(255,236,170,0.96); color: #6b3d00; border: #ffb400"></a-entity>');
  add('<a-entity id="q-label-vapour" visible="false" position="0.34 -0.18 0.36" rotation="65 0 0" ar-text="value: يتحول الماء السائل|إلى بخار ماء يصعد|إلى أعلى; width: 0.34; size: 92; bg: rgba(235,247,255,0.96); color: #0b3d63; border: #5aa9e6"></a-entity>');

  var STEPS = ['q-sun', 'q-heat', 'q-drop', 'q-vapour', 'q-up', 'q-cloud', 'q-label-sun', 'q-label-vapour'];
  var timers = [];
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function pop(id, dur) {
    var e = $(id);
    vis(id, true);
    e.removeAttribute('animation__pop');
    e.setAttribute('scale', '0.01 0.01 0.01');
    e.setAttribute('animation__pop', { property: 'scale', from: '0.01 0.01 0.01', to: '1 1 1', dur: dur || 800, easing: 'easeOutBack' });
  }

  function reset() {
    timers.forEach(clearTimeout); timers = [];
    STEPS.forEach(function (id) { vis(id, false); $(id).removeAttribute('animation__pop'); });
    var d = $('q-drop');
    d.removeAttribute('animation__fly');
    d.setAttribute('position', '-0.13 -0.1 0.12');
    $('q-drop-model').removeAttribute('animation__vap');
    $('q-drop-model').setAttribute('model-opacity', 1);
  }

  function play() {
    reset();
    later(300, function () { pop('q-sun', 900); });                         // 1. the sun
    later(1500, function () { pop('q-label-sun', 500); });
    later(2600, function () { vis('q-heat', true); });                      // 2. red arrows to the sea
    later(5600, function () { pop('q-drop', 800); });                       // 3. Qattoura
    later(8600, function () {                                               // 4. she rises with the blue arrows
      vis('q-vapour', true); vis('q-up', true); pop('q-label-vapour', 500);
      $('q-drop').setAttribute('animation__fly', { property: 'position', to: '0.02 0.1 0.66', dur: 4600, easing: 'easeInOutSine' });
      $('q-drop-model').setAttribute('animation__vap', { property: 'model-opacity', from: 1, to: 0.32, dur: 4600, easing: 'easeInQuad' });
    });
    later(13400, function () { pop('q-cloud', 1100); });                    // 5. the cloud
    later(21000, play);                                                     // then tell the story again
  }

  return { play: play, reset: reset };
}
