const fs = require('fs');

const adminPath = 'src/app/admin/page.tsx';
let adminCode = fs.readFileSync(adminPath, 'utf8');

// Remover tab Visual do menu NAV
adminCode = adminCode.replace(
  /\{ id: "visual", label: "Layout", icon: "🎨" \},\n\s*/,
  ""
);

// Copiar a renderização do VisualTab para dentro do EventForm
// Vamos procurar a div do EventForm e colocar os campos Theme_layout, theme_font, theme_color lá
// Vou procurar a string "Tamanhos de Camisa" e injetar o bloco de layout logo abaixo
const layoutBlock = `
        {/* === CONFIGURAÇÕES DE VISUAL (MOVIDAS DO PAINEL ESQUERDO) === */}
        <div className="mt-8 rounded-2xl border border-white/5 bg-white/5 p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎨</span>
            <h3 className="text-lg font-bold">Identidade Visual do Evento</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Layout</label>
              <select
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2"
                value={form.theme_layout || "default"}
                onChange={(e) => setForm({ ...form, theme_layout: e.target.value })}
              >
                <option value="default">Clássico / Padrão</option>
                <option value="split">Moderno (Dividido)</option>
                <option value="revista">Revista / Editorial</option>
                <option value="poster">Pôster</option>
                <option value="minimal">Minimalista</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Tipografia (Fonte)</label>
              <select
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2"
                value={form.theme_font || "sans"}
                onChange={(e) => setForm({ ...form, theme_font: e.target.value })}
              >
                <option value="sans">Sem Serifa (Moderna)</option>
                <option value="serif">Com Serifa (Clássica)</option>
                <option value="mono">Monoespaçada (Tech)</option>
                <option value="display">Display (Impacto)</option>
                <option value="rounded">Arredondada (Amigável)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Cor Principal</label>
              <select
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2"
                value={form.theme_color || "brand"}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
              >
                <option value="brand">Laranja (Padrão)</option>
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="red">Vermelho</option>
                <option value="purple">Roxo</option>
                <option value="dark">Preto/Escuro</option>
              </select>
            </div>
          </div>
        </div>
`;

adminCode = adminCode.replace(
  /(<label className="mb-1 block text-sm text-slate-400">\s*Tamanhos de Camisa[\s\S]*?<\/div>\s*<\/div>\s*)(<\/div>\s*<div className="mt-8 flex justify-end">)/,
  `$1${layoutBlock}$2`
);

// Ocultar a tab visual se o componente VisualTab ainda existir
// Ou simplesmente deixar a string, já que não tem o botão no NAV não entra nela.

fs.writeFileSync(adminPath, adminCode, 'utf8');
console.log("FIX_ADMIN_DONE");
