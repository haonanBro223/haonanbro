const { Flow } = require('vexflow');

module.exports = (req, res) => {
  const note = (req.body.note || '').toLowerCase();
  const VF   = Flow;

  // 1. SVG 后端渲染器
  const renderer = new VF.Renderer(null, VF.Renderer.Backends.SVG);
  renderer.resize(700, 400);
  const svgCtx = renderer.getContext();

  // 2. 画空谱表
  const treble = new VF.Stave(10, 10, 680)
    .addClef('treble')
    .setContext(svgCtx)
    .setEndBarType(VF.Barline.type.NONE)
    .draw();
  const bass = new VF.Stave(10, 210, 680)
    .addClef('bass')
    .setContext(svgCtx)
    .setEndBarType(VF.Barline.type.NONE)
    .draw();

  // 连线 + 花括号
  svgCtx.beginPath();
  svgCtx.moveTo(treble.getX(), treble.getYForLine(0));
  svgCtx.lineTo(bass.getX(), bass.getYForLine(4));
  svgCtx.setLineWidth(2);
  svgCtx.stroke();
  new VF.StaveConnector(treble, bass)
    .setType(VF.StaveConnector.type.BRACE)
    .setContext(svgCtx)
    .draw();

  // 3. 如果有 note，就画音符
  if (/^[a-g]#?\\d$/.test(note)) {
    const [, letter, sharp, oct] = note.match(/^([a-g])(#?)(\\d)$/);
    const clef  = parseInt(oct, 10) >= 4 ? 'treble' : 'bass';
    const stave = clef === 'treble' ? treble : bass;
    const key   = `${letter}/${oct}`;
    const noteObj = new VF.StaveNote({ clef, keys: [key], duration: 'q' });
    if (sharp) noteObj.addAccidental(0, new VF.Accidental('#'));

    const voice = new VF.Voice({ num_beats: 1, beat_value: 4 })
      .addTickables([noteObj]);
    new VF.Formatter().joinVoices([voice]).format([voice], 600);
    voice.draw(svgCtx, stave);
  }

  // 4. 返回 Base64 数据
  const svgString = svgCtx.svg.outerHTML;
  const svgBase64 = Buffer.from(svgString).toString('base64');
  res.json({ svgDataUrl: `data:image/svg+xml;base64,${svgBase64}` });
};