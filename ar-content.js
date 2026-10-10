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

/* Builds the whole evaporation scene inside the given parent entity. */
function buildQattouraCard(parent) {
  function add(html) { parent.insertAdjacentHTML('beforeend', html); }

  // Light, so the models are not flat
  add('<a-entity light="type: ambient; intensity: 1.0; color: #ffffff"></a-entity>');
  add('<a-entity light="type: directional; intensity: 1.1; color: #fff3d0" position="-0.4 -0.6 1"></a-entity>');

  // The sun, floating above its place in the picture
  add('<a-entity position="-0.33 0.16 0.46" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-sun" scale="0.082 0.082 0.082" animation-mixer="clip: *; loop: repeat"' +
        ' animation="property: position; from: 0 0 0; to: 0 0.02 0; dur: 1800; dir: alternate; loop: true; easing: easeInOutSine"></a-entity>' +
      '</a-entity>');

  // Heat going down from the sun to the sea
  add('<a-entity position="-0.24 0.06 0.32" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-heat" scale="0.105 0.105 0.105" rotation="-12 0 -14" animation-mixer="clip: *; loop: repeat"></a-entity>' +
      '</a-entity>');

  // Qattoura, the water drop, standing in the sea
  add('<a-entity position="-0.13 -0.1 0.12" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-drop" scale="0.1 0.1 0.1" rotation="0 12 0" animation-mixer="clip: *; loop: repeat"></a-entity>' +
      '</a-entity>');

  // Water vapour rising: faint, because real water vapour cannot be seen
  [[0.14, -0.02, 0, 1.0], [0.27, 0.05, 900, 1.25], [0.39, -0.04, 1800, 0.9]].forEach(function (w) {
    add('<a-entity position="' + w[0] + ' ' + w[1] + ' 0.02" rotation="90 0 0">' +
          '<a-entity gltf-model="#m-wisp" scale="' + (0.15 * w[3]) + ' ' + (0.17 * w[3]) + ' ' + (0.15 * w[3]) + '" model-opacity="0"' +
          ' animation__rise="property: position; from: 0 0 0; to: 0 0.26 0; dur: 3600; delay: ' + w[2] + '; loop: true; easing: linear"' +
          ' animation__in="property: model-opacity; from: 0; to: 0.6; dur: 1200; delay: ' + w[2] + '; loop: true; easing: easeOutQuad"' +
          ' animation__out="property: model-opacity; from: 0.6; to: 0; dur: 2400; delay: ' + (w[2] + 1200) + '; loop: true; easing: easeInQuad"></a-entity>' +
        '</a-entity>');
  });

  // Arrows showing the direction: upward
  add('<a-entity position="0.27 0.14 0.14" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-up" scale="0.13 0.13 0.13" model-opacity="0.9"' +
        ' animation__rise="property: position; from: 0 0 0; to: 0 0.2 0; dur: 2600; loop: true; easing: easeInOutSine"' +
        ' animation__fade="property: model-opacity; from: 0.95; to: 0.1; dur: 2600; loop: true; easing: easeInQuad"></a-entity>' +
      '</a-entity>');

  // A cloud high above, where the vapour is heading
  add('<a-entity position="0.3 0.2 0.72" rotation="90 0 0">' +
        '<a-entity gltf-model="#m-cloud" scale="0.12 0.12 0.12"' +
        ' animation="property: position; from: -0.03 0 0; to: 0.03 0 0; dur: 5000; dir: alternate; loop: true; easing: easeInOutSine"></a-entity>' +
      '</a-entity>');

  // Arabic labels, standing up and facing the pupil
  add('<a-entity position="0 0.31 0.9" rotation="65 0 0" ar-text="value: التبخر; width: 0.34; size: 150; bg: rgba(11,111,184,0.96); color: #ffffff"></a-entity>');
  add('<a-entity position="-0.3 -0.02 0.72" rotation="65 0 0" ar-text="value: الشمس تسخّن|ماء البحر; width: 0.3; size: 96; bg: rgba(255,236,170,0.96); color: #6b3d00; border: #ffb400"></a-entity>');
  add('<a-entity position="0.3 -0.16 0.5" rotation="65 0 0" ar-text="value: يتحول الماء السائل|إلى بخار ماء يصعد|إلى أعلى; width: 0.34; size: 92; bg: rgba(235,247,255,0.96); color: #0b3d63; border: #5aa9e6"></a-entity>');
}
