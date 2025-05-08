const { Flow } = require('vexflow');

// Netlify Function entry point must export `handler`
exports.handler = async (event, context) => {
  try {
    // —— 新增：同时支持 GET 和 POST ——  
    let note = '';
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      note = (body.note || '').toLowerCase();
    } else {
      const qs = event.queryStringParameters || {};
      note = (qs.note || '').toLowerCase();
    }
    const VF = Flow;

    // Create SVG renderer (no DOM required)
    const renderer = new VF.Renderer(null, VF.Renderer.Backends.SVG);
    renderer.resize(700, 400);
    const svgCtx = renderer.getContext();

    // Draw treble and bass staves
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

    // Draw connector and brace
    svgCtx.beginPath();
    svgCtx.moveTo(treble.getX(), treble.getYForLine(0));
    svgCtx.lineTo(bass.getX(), bass.getYForLine(4));
    svgCtx.setLineWidth(2);
    svgCtx.stroke();
    new VF.StaveConnector(treble, bass)
      .setType(VF.StaveConnector.type.BRACE)
      .setContext(svgCtx)
      .draw();

    // If a note is provided, draw it
    if (/^[a-g]#?\d$/.test(note)) {
      const [, letter, sharp, oct] = note.match(/^([a-g])(#?)(\d)$/);
      const clef = parseInt(oct, 10) >= 4 ? 'treble' : 'bass';
      const stave = clef === 'treble' ? treble : bass;
      const key = `${letter}/${oct}`;
      const noteObj = new VF.StaveNote({ clef, keys: [key], duration: 'q' });
      if (sharp) noteObj.addAccidental(0, new VF.Accidental('#'));

      const voice = new VF.Voice({ num_beats: 1, beat_value: 4 }).addTickables([noteObj]);
      new VF.Formatter().joinVoices([voice]).format([voice], 600);
      voice.draw(svgCtx, stave);
    }

    // Export SVG
    const svgString = svgCtx.svg.outerHTML;
    const svgBase64 = Buffer.from(svgString).toString('base64');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svgDataUrl: `data:image/svg+xml;base64,${svgBase64}` })
    };
  } catch (err) {
    console.error('Error in renderSvgStave:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
