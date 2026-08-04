const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Remover fotos e recebimento do NAV
code = code.replace(/\{\s*id:\s*[\"']fotos[\"'].*?\n/g, '');
code = code.replace(/\{\s*id:\s*[\"']recebimento[\"'].*?\n/g, '');

// 2. Extrair o conteúdo das abas antigas
const fotosMatch = code.match(/\{\s*activeTab === [\"']fotos[\"'] && \(\s*([\s\S]*?)\s*\)\}/);
const recebimentoMatch = code.match(/\{\s*activeTab === [\"']recebimento[\"'] && \(\s*([\s\S]*?)\s*\)\}/);

if (fotosMatch && recebimentoMatch) {
  const fotosContent = fotosMatch[1];
  const recebimentoContent = recebimentoMatch[1];

  // 3. Remover os blocos antigos
  code = code.replace(/\{\s*activeTab === [\"']fotos[\"'] && \(\s*([\s\S]*?)\s*\)\}/, '');
  code = code.replace(/\{\s*activeTab === [\"']recebimento[\"'] && \(\s*([\s\S]*?)\s*\)\}/, '');

  // 4. Inserir no final do bloco do evento
  const target = /<\/form>\s*\n\s*\)\}/;
  code = code.replace(target, `</form>
                
                <div className="mt-8 space-y-8 pb-12 border-t border-white/10 pt-8">
                  ${fotosContent}
                  ${recebimentoContent}
                </div>
              )}`);
              
  fs.writeFileSync('src/app/admin/page.tsx', code, 'utf8');
  console.log('REPLACED_OK');
} else {
  console.log('MATCH_FAILED');
  console.log('fotos:', !!fotosMatch, 'recebimento:', !!recebimentoMatch);
}
