// LP de Captação · Carolina Hohlenwerger Advocacia (verbas não pagas no serviço público)
// Gera index.html (página completa, com GTM) e elementor-embed.html (widget HTML do Elementor, CSS escopado).
// Uso: node build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;

// ---------- Configuração ----------
const WA_NUM = '557381219339'; // número do briefing
const wa = msg => `https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`;

const CFG = {
  GTM_ID: 'GTM-M6NT5GX4',
  EMAIL: 'carollmaria@hotmail.com', // do cartão de visitas
  WA_DISPLAY: 'Fale pelo WhatsApp',
  // Mensagem pré-preenchida por perfil: já chega no WhatsApp com o tipo de vínculo identificado
  WA_GERAL: wa('Olá! Vim pelo site. Saí de um trabalho no serviço público com pagamentos pendentes e gostaria de falar com um advogado.'),
  WA_COMISSIONADO: wa('Olá! Vim pelo site. Fui exonerado(a) de um cargo comissionado e ficaram pagamentos pendentes. Gostaria de falar com um advogado.'),
  WA_CONTRATADO: wa('Olá! Vim pelo site. Meu contrato com a prefeitura (contratado/professor) foi encerrado e tenho dúvidas sobre os pagamentos. Gostaria de falar com um advogado.'),
  WA_TERCEIRIZADO: wa('Olá! Vim pelo site. Trabalhava em uma empresa terceirizada de órgão público e fui desligado(a) sem receber a rescisão. Gostaria de falar com um advogado.'),
};

// Pasta das imagens: relativa no index.html; no embed, URL da Biblioteca de Mídia do WordPress
const ASSETS_LOCAL = 'assets';
const ASSETS_EMBED = 'https://carolinahohlenwerger.com.br/wp-content/uploads/2026/11'; // PENDENTE: subir a pasta assets/ e confirmar este caminho

const FAQ = [
  ['Fui comissionado(a). Tenho mesmo algum direito depois da exoneração?', 'Pode ter. A exoneração encerra o cargo, mas não apaga os pagamentos referentes ao período trabalhado. Férias, adicional de 1/3, 13º e salários pendentes podem ser devidos, conforme o vínculo e a legislação aplicável. A análise do caso mostra o que se aplica à sua situação.'],
  ['O que acontece depois que eu enviar a mensagem?', 'No primeiro contato, são identificados o tipo de vínculo, o órgão público ou a empresa, o município, a data do desligamento e os pagamentos pendentes. Com isso, você recebe a orientação sobre quais documentos separar e o caso segue para a análise jurídica individualizada.'],
  ['Preciso já ter todos os documentos para entrar em contato?', 'Não. Você pode começar contando a sua situação pelo WhatsApp. A partir das informações iniciais, a advogada indica quais documentos são necessários para analisar o seu caso.'],
  ['Existe prazo para cobrar os valores?', 'Sim. A cobrança de valores está sujeita a prazos previstos em lei, que variam conforme o tipo de vínculo. Por isso, é importante não adiar a análise do caso.'],
  ['A prefeitura ou a empresa vai saber que procurei uma advogada?', 'O contato com a advogada é protegido pelo sigilo profissional. Qualquer medida de cobrança só é tomada com a sua autorização, depois que você entender os caminhos possíveis.'],
  ['Trabalhei em Salvador, Camaçari, Lauro de Freitas, Itabuna ou Ipiaú. Posso ser atendido(a)?', 'Sim. Informe no primeiro contato o município e o órgão público ou a empresa onde trabalhava, para que o atendimento seja orientado conforme a sua situação.'],
  ['Como funciona a contratação e os honorários?', 'As condições do atendimento são explicadas no contato pelo WhatsApp, antes de qualquer contratação, para que você decida sabendo exatamente como funciona.'],
];

// ---------- Monta a página ----------
let page = fs.readFileSync(path.join(dir, 'src.html'), 'utf8');

page = page.replace('<!--FAQ-->', FAQ.map(([q, a], i) => `        <details class="faq-item rv"${i === 0 ? ' open' : ''}>
          <summary><span>${q}</span><span class="faq-plus"><svg aria-hidden="true"><use href="#ic-plus-bold"/></svg></span></summary>
          <div class="faq-a"><p>${a}</p></div>
        </details>`).join('\n'));

const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
page = page.replace('<!--FAQ_LD-->', `    <script type="application/ld+json">${JSON.stringify(ld)}</script>`);

// Ícones usados (Phosphor) viram <symbol>
const used = [...new Set([...page.matchAll(/#ic-([a-z-]+)/g)].map(m => m[1]))];
const symbols = used.map(n => {
  const svg = fs.readFileSync(path.join(dir, 'icons', n + '.svg'), 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="256" height="256" fill="none"\/>/g, '');
  return `    <symbol id="ic-${n}" viewBox="0 0 256 256"><g fill="currentColor">${inner}</g></symbol>`;
}).join('\n');
page = page.replace('<!--ICONS-->', symbols);

for (const [k, v] of Object.entries(CFG)) page = page.split(`{{${k}}}`).join(v.replace(/&/g, '&amp;'));
const pageFor = assets => {
  const out = page.split('{{ASSETS}}').join(assets);
  if (/\{\{[A-Z_]+\}\}/.test(out)) throw new Error('placeholder sem valor: ' + out.match(/\{\{[A-Z_]+\}\}/)[0]);
  return out;
};

const indexHtml = pageFor(ASSETS_LOCAL);
fs.writeFileSync(path.join(dir, 'index.html'), indexHtml);

// ---------- Embed para o Elementor ----------
const ROOT = '#cnh-lp';
const full = pageFor(ASSETS_EMBED);
const headLinks = full.match(/<link rel="preconnect"[\s\S]*?<\/noscript>/)[0];
const css = full.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
const body = full.match(/<\/noscript>\s*<!-- End Google Tag Manager \(noscript\) -->([\s\S]*?)<script id="lp-js">/)[1];
const js = full.match(/<script id="lp-js">([\s\S]*?)<\/script>/)[1];

function scopeSelector(sel) {
  sel = sel.trim();
  if (sel === ':root' || sel === 'body') return ROOT;
  if (sel === 'html') return 'html';
  if (sel.startsWith('*')) return `${ROOT} ${sel}`;
  return `${ROOT} ${sel}`;
}
function scopeCss(input) {
  let out = '', i = 0;
  while (i < input.length) {
    const open = input.indexOf('{', i);
    if (open === -1) { out += input.slice(i); break; }
    const head = input.slice(i, open);
    let depth = 1, j = open + 1;
    while (depth && j < input.length) { if (input[j] === '{') depth++; else if (input[j] === '}') depth--; j++; }
    const inner = input.slice(open + 1, j - 1);
    const lead = head.match(/^\s*/)[0];
    const h = head.trim();
    if (h.startsWith('@media') || h.startsWith('@supports')) out += `${lead}${h} {${scopeCss(inner)}}`;
    else if (h.startsWith('@')) out += `${lead}${h} {${inner}}`;
    else out += `${lead}${h.split(',').map(scopeSelector).join(', ')} {${inner}}`;
    i = j;
  }
  return out;
}

const scoped = scopeCss(css) + `
  ${ROOT} { position: relative; width: 100vw; max-width: 100vw; margin-left: calc(50% - 50vw); overflow-x: hidden; }
  ${ROOT} h1, ${ROOT} h2, ${ROOT} h3, ${ROOT} h4 { text-transform: none; }
  ${ROOT} .ed-title { text-transform: uppercase; }
  ${ROOT} .hero h1, ${ROOT} .final .ed-title, ${ROOT} .how-step h3, ${ROOT} .why-cell h3 { color: #fff; }
  ${ROOT} a:hover, ${ROOT} a:focus { text-decoration: none; }
  ${ROOT} .btn, ${ROOT} .btn:hover, ${ROOT} .btn:focus { color: #fff; }
  ${ROOT} ul, ${ROOT} li { margin: 0; }
  ${ROOT} section { margin: 0; }
`;

const html = body.replace('<main id="topo">', '<div id="topo">').replace('</main>', '</div>').trim();
const scopedJs = js
  .replace(/document\.querySelectorAll\(/g, 'root.querySelectorAll(')
  .replace("document.getElementById('waFloat')", "root.querySelector('#waFloat')");

const gtm = `<!-- Google Tag Manager (só carrega se o site ainda não tiver este container) -->
<script>(function(w,d,s,l,i){if(w.google_tag_manager&&w.google_tag_manager[i])return;
if(d.querySelector('script[src*="googletagmanager.com/gtm.js?id='+i+'"]'))return;
w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${CFG.GTM_ID}');</script>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${CFG.GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->`;

const embed = `<!--
  Carolina Hohlenwerger Advocacia · LP de Captação (verbas não pagas no serviço público) · widget HTML do Elementor
  Página: modelo "Elementor Canvas", 1 seção full width sem padding, 1 widget HTML com este código.
  Imagens: subir o conteúdo de assets/ em ${ASSETS_EMBED}/ (ou ajustar ASSETS_EMBED em build.js e rodar de novo).
  GTM (${CFG.GTM_ID}) com trava contra duplicidade. Cliques no WhatsApp disparam "whatsapp_click" (cta_position, perfil).
-->
${gtm}
${headLinks}
<style>
${scoped}
</style>

<div id="cnh-lp">
${html}
</div>

<script>
(function () {
  const root = document.getElementById('cnh-lp');
  if (!root) return;
${scopedJs.replace(/^/gm, '  ').trimEnd()}
})();
</script>
`;
fs.writeFileSync(path.join(dir, 'elementor-embed.html'), embed);
console.log(`index.html ${(indexHtml.length / 1024).toFixed(1)} KB · elementor-embed.html ${(embed.length / 1024).toFixed(1)} KB · ícones: ${used.join(', ')}`);
