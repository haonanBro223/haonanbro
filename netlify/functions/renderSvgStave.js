// netlify/functions/renderPngStave.js
const { Flow } = require('vexflow');
const { createCanvas } = require('canvas');

exports.handler = async (event) => {
  try {
    // 1. 解析 Note 支持 GET/POST
    let note = '';
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      note = (body.note || '').toLowerCase();
    } else {
      note = (event.queryStringParameters?.note || '').toLowerCase();
    }

    // 2. 在 Node 上创建 Canvas
    const width = 700, height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. 初始化 VexFlow Canvas 渲染器
    const renderer = new Flow.Renderer(canvas, Flow.Renderer.Backends.CANVAS);
    renderer.resize(width, height);
    const vfctx = renderer.getContext();

    // 4. 画高低谱表
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

    // 画连接线 + 花括号
    vfctx.beginPath();
    vfctx.moveTo(treble.getX(), treble.getYForLine(0));
    vfctx.lineTo(bass.getX(), bass.getYForLine(4));
    vfctx.lineWidth = 2;
    vfctx.stroke();
    new Flow.StaveConnector(treble, bass)
      .setType(Flow.StaveConnector.type.BRACE)
      .setContext(vfctx)
      .draw();

    // 5. 如果有 note，再画音符
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

    // 6. 导出 PNG Base64
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
