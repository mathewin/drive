// Teste do painel Parceiro (integrado ao painel-colaborador.html, modo parceiro)
const { setup, loadPanelScript } = require('./test_harness');

function seedDb(){
  return {
    perfis: [
      { id:'u-par', nome:'Carlos', papel:'parceiro', email:'carlos@x.com', todas_tropas:false, tropa_ids:[] },
      { id:'u-moto', nome:'Joao', papel:'motorista', email:'joao@x.com', todas_tropas:false, tropa_ids:[] },
    ],
    tropas: [ { id:'t1', nome:'Tropa do Carlos', ativa:true } ],
    parceiros: [ { id:'p1', nome:'Carlos', email:'carlos@x.com', cupom:'CAR10', tropa_id:'t1', comissao_mes:2.98, comissao_total:14.90 } ],
    candidatos: [],
    assinantes: [
      { id:'a1', nome:'Joao', tropa_id:'t1', status:'pago', ativo:true, valor:21.99, cupom:'CAR10', venc:'2026-10-01T00:00:00Z', historico:[] },
      { id:'a2', nome:'Maria', tropa_id:'t1', status:'pago', ativo:true, valor:29.99, cupom:null, historico:[] },
      { id:'a3', nome:'Pedro', tropa_id:'t1', status:'pendente', ativo:false, valor:21.99, cupom:'CAR10', historico:[] },
    ],
    fila_pagamento: [],
    config: [ { chave:'comissao_parceiro', valor:'1.49' }, { chave:'premio_diario', valor:'50' } ],
    alertas_fraude: [], ranking_regiao: [], premios: [],
    chamados: [],
    lancamentos: [], metas: [],
    financeiro: [],
    auditoria: [],
  };
}

async function main(){
  const { document, db, auth } = setup(seedDb);
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-par', email } }, error:null });

  loadPanelScript('painel-colaborador.html');

  // --- login no modo parceiro ---
  window.setRole('parceiro', document.getElementById('login-role'));
  document.getElementById('login-email').value = 'carlos@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrar();
  if(document.getElementById('app').classList.contains('active') === false){
    console.error('[parceiro] FALHOU: login nao ativou app');
    process.exit(1);
  }
  const nomeEl = document.getElementById('colab-ativo-nome').textContent;
  if(!nomeEl.includes('Carlos')){ console.error('[parceiro] FALHOU: nome do parceiro', nomeEl); process.exit(1); }
  console.log('[parceiro] login ok →', nomeEl);

  // --- visão geral: cupom, comissão, filtro por cupom ---
  await window.renderVisao();
  const cupom = document.getElementById('par-cupom-codigo').textContent;
  const comissaoMes = document.getElementById('par-comissao-mes').textContent;
  const totalNum = document.getElementById('par-total-num').textContent;
  const ativosTxt = document.getElementById('par-ativos-txt').textContent;
  const tropaNome = document.getElementById('par-tropa-nome').textContent;
  if(cupom !== 'CAR10'){ console.error('[parceiro] FALHOU: cupom', cupom); process.exit(1); }
  if(!comissaoMes.includes('2,98')){ console.error('[parceiro] FALHOU: comissao mes', comissaoMes); process.exit(1); }
  if(totalNum !== '2'){ console.error('[parceiro] FALHOU: total assinantes (deveria ser 2, sem Maria)', totalNum); process.exit(1); }
  if(!ativosTxt.includes('1 ativo')){ console.error('[parceiro] FALHOU: ativos', ativosTxt); process.exit(1); }
  if(!tropaNome.includes('Tropa do Carlos')){ console.error('[parceiro] FALHOU: tropa', tropaNome); process.exit(1); }
  console.log('[parceiro] visão geral ok → cupom CAR10, comissão mês R$2,98, 2 assinantes (1 ativo)');

  // --- campeonato: 1 ativo → nenhum marco liberado ---
  const champsHTML = document.getElementById('par-champs').innerHTML;
  if(champsHTML.includes('LIBERADO')){
    console.error('[parceiro] FALHOU: campeonato marcado como liberado com 1 ativo', champsHTML);
    process.exit(1);
  }
  console.log('[parceiro] campeonato ok → marcos 60/90/120 não liberados com 1 ativo');

  // --- lista de motoristas: só quem usou o cupom ---
  await window.renderParceiroMotoristas();
  const rowsHTML = document.getElementById('par-list-rows').innerHTML;
  if(!rowsHTML.includes('Joao') || !rowsHTML.includes('Pedro') || rowsHTML.includes('Maria')){
    console.error('[parceiro] FALHOU: lista motoristas', rowsHTML);
    process.exit(1);
  }
  if(!rowsHTML.includes('21,99')){
    console.error('[parceiro] FALHOU: valor pago não aparece', rowsHTML);
    process.exit(1);
  }
  console.log('[parceiro] lista de motoristas ok → Joao e Pedro visíveis, Maria (sem cupom) oculta');

  // --- conta de motorista não entra no modo parceiro ---
  await window.sair();
  if(document.getElementById('app').classList.contains('active')){
    console.error('[parceiro] FALHOU: app continuou ativo após sair');
    process.exit(1);
  }
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-moto', email } }, error:null });
  window.setRole('parceiro', document.getElementById('login-role'));
  document.getElementById('login-email').value = 'joao@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrar();
  if(document.getElementById('app').classList.contains('active')){
    console.error('[parceiro] FALHOU: motorista entrou como parceiro');
    process.exit(1);
  }
  const errText = document.getElementById('login-erro').textContent;
  if(!errText.includes('não é de um parceiro')){ console.error('[parceiro] FALHOU: erro esperado', errText); process.exit(1); }
  console.log('[parceiro] motorista bloqueado no modo parceiro ok');

  console.log('\n=== TESTES PARCEIRO PASSARAM ===');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error('FALHA:', e && e.stack || e); process.exit(1); });
