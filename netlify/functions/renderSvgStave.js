// netlify/functions/renderSvgStave.js

// —— 新增：模拟 DOM ——  
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><body><div id="container"></div></body>`);
global.window = dom.window;
global.document = dom.window.document;

// VexFlow 与 SVG 渲染
const { Flow } = require('vexflow');
const VF = Flow;

exports.handler = async (event, context) => {
  try {
    // —— 同前：解析 note 支持 GET/POST ——  
    let note = '';
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      note = (body.note || '').toLowerCase();
    } else {
      const qs = event.queryStringParameters || {};
      note = (qs.note || '').toLowerCase();
    }

    // —— 1. 找到“容器”DIV ——  
    const container = document.getElementById('container');

    // —— 2. 创建 SVG 渲染器 ——  
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(700, 400);
    const svgCtx = renderer.getContext();

    // —— 3. 绘制高低谱表 + 连线 + 花括号 ——  
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

    svgCtx.beginPath();
    svgCtx.moveTo(treble.getX(), treble.getYForLine(0));
    svgCtx.lineTo(bass.getX(),   bass.getYForLine(4));
    svgCtx.setLineWidth(2);
    svgCtx.stroke();

    new VF.StaveConnector(treble, bass)
      .setType(VF.StaveConnector.type.BRACE)
      .setContext(svgCtx)
      .draw();

    // —— 4. 如果有 note，就画音符 ——  
    if (/^[a-g]#?\d$/.test(note)) {
      const [, letter, sharp, oct] = note.match(/^([a-g])(#?)(\d)$/);
      const clef  = parseInt(oct, 10) >= 4 ? 'treble' : 'bass';
      const stave = (clef === 'treble' ? treble : bass);
      const key   = `${letter}/${oct}`;
      const noteObj = new VF.StaveNote({ clef, keys: [key], duration: 'q' });
      if (sharp) noteObj.addAccidental(0, new VF.Accidental('#'));

      const voice = new VF.Voice({ num_beats: 1, beat_value: 4 })
        .addTickables([noteObj]);
      new VF.Formatter().joinVoices([voice]).format([voice], 600);
      voice.draw(svgCtx, stave);
    }

    // —— 5. 导出 SVG 并返回 Base64 ——  
    const svgString = container.querySelector('svg').outerHTML;
    const svgBase64 = Buffer.from(svgString).toString('base64');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svgDataUrl: `data:image/svg+xml;base64,${svgBase64}` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
