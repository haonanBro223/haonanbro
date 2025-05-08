const { Flow } = require('vexflow');
const { createCanvas } = require('canvas');

exports.handler = async (event) => {
  try {
    // Parse note from POST or GET
    let note = '';
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      note = (body.note || '').toLowerCase();
    } else {
      const qs = event.queryStringParameters || {};
      note = (qs.note || '').toLowerCase();
    }

    // Create canvas
    const width = 700, height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // VexFlow Canvas renderer
    const renderer = new Flow.Renderer(canvas, Flow.Renderer.Backends.CANVAS);
    renderer.resize(width, height);
    const vfctx = renderer.getContext();

    // Draw treble and bass staves
    const treble = new Flow.Stave(10, 10, 680)
      .addClef('treble')
      .setContext(vfctx)
      .setEndBarType(Flow.Barline.type.NONE)
      .draw();
    const bass = new Flow.Stave(10, 210, 680)
      .addClef('bass')
      .setContext(vfctx)
      .setEndBarType(Flow.Barline.type.NONE)
      .draw();

    // Draw connector bar and brace
    vfctx.beginPath();
    vfctx.moveTo(treble.getX(), treble.getYForLine(0));
    vfctx.lineTo(bass.getX(), bass.getYForLine(4));
    vfctx.lineWidth = 2;
    vfctx.stroke();
    new Flow.StaveConnector(treble, bass)
      .setType(Flow.StaveConnector.type.BRACE)
      .setContext(vfctx)
      .draw();

    // If a note is provided, draw the note
    if (/^[a-g]#?\d$/.test(note)) {
      const [, letter, sharp, oct] = note.match(/^([a-g])(#?)(\d)$/);
      const clef = parseInt(oct, 10) >= 4 ? 'treble' : 'bass';
      const stave = clef === 'treble' ? treble : bass;
      const key = `${letter}/${oct}`;
      const noteObj = new Flow.StaveNote({ clef, keys: [key], duration: 'q' });
      if (sharp) noteObj.addAccidental(0, new Flow.Accidental('#'));
      const voice = new Flow.Voice({ num_beats: 1, beat_value: 4 })
        .addTickables([noteObj]);
      new Flow.Formatter().joinVoices([voice]).format([voice], 600);
      voice.draw(vfctx, stave);
    }

    // Export PNG Base64
    const buffer = canvas.toBuffer('image/png');
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pngDataUrl: dataUrl }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};