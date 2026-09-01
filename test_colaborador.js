// Teste do painel Colaborador (Supabase)
const { setup, loadPanelScript } = require('./test_harness');

function seedDb(){
  return {
    perfis: [
      { id:'u-colab', nome:'Colab', papel:'colaborador', email:'colab@drivewin.com', todas_tropas:true, tropa_ids:[] },
      { id:'u-moto', nome:'Joao', papel:'motorista', email:'joao@x.com', todas_tropas:false, tropa_ids:[] },
    ],
    tropas: [
      { id:'t1', nome:'Tropa do Carlos', ativa:true },
      { id:'t2', nome:'Tropa da Maria', ativa:true },
    ],
    parceiros: [ { id:'p1', nome:'Carlos', cupom:'CAR10', tropa_id:'t1', comissao_mes:0, comissao_total:0 } ],
    candidatos: [],
    assinantes: [
      { id:'a1', nome:'Joao', tropa_id:'t1', status:'pago', ativo:true, cupom:'CAR10', historico:[] },
      { id:'a2', nome:'Maria', tropa_id:'t2', status:'pago', ativo:true, historico:[] },
      { id:'a3', nome:'Pedro', tropa_id:null, status:'pago', ativo:true, historico:[] },
    ],
    fila_pagamento: [
      { id:'fp1', assinante:'Joao', valor:21.99, motivo:'Pix via app' },
      { id:'fp2', assinante:'Maria', valor:29.99, motivo:'Pix via app' },
    ],
    config: [ { chave:'comissao_parceiro', valor:'1.49' } ],
    alertas_fraude: [], ranking_regiao: [], premios: [],
    chamados: [
      { id:'ch1', nome:'Joao', tropa:'Tropa do Carlos', assunto:'Problema no pagamento', status:'aberto',
        mensagem:'Não consigo entrar', thread:[{ de:'motorista', texto:'Não consigo entrar', em:'01/09 10:00' }], criado_em:'2026-09-01T10:00:00Z', atualizado_em:'2026-09-01T10:00:00Z' },
      { id:'ch2', nome:'Maria', tropa:'Tropa da Maria', assunto:'Dúvida', status:'respondido',
        mensagem:'Como funciona?', thread:[{ de:'motorista', texto:'Como funciona?', em:'01/09 11:00' },{ de:'suporte', texto:'É assim...', em:'01/09 12:00' }], criado_em:'2026-09-01T11:00:00Z', atualizado_em:'2026-09-01T12:00:00Z' },
    ],
    lancamentos: [], metas: [],
    financeiro: [{ id:1, receita_bruta:0, comissoes_pagas:0, premiacao_paga:0, data_lancamento:'2026-09-01' }],
    auditoria: [],
  };
}

async function main(){
  const { document, db, auth } = setup(seedDb);
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-colab', email } }, error:null });

  loadPanelScript('painel-colaborador.html');

  // --- login ---
  document.getElementById('login-email').value = 'colab@drivewin.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrar();
  if(document.getElementById('app').classList.contains('active') === false){
    console.error('[colab] FALHOU: login nao ativou app');
    process.exit(1);
  }
  console.log('[colab] login ok — logado como', document.getElementById('colab-ativo-nome').textContent);

  // --- suporte: lista chamados ---
  await window.renderSuporte();
  const listaHTML = document.getElementById('suporte-lista').innerHTML;
  if(!listaHTML.includes('Problema no pagamento') || !listaHTML.includes('Dúvida')){
    console.error('[colab] FALHOU: lista de chamados', listaHTML);
    process.exit(1);
  }
  console.log('[colab] renderSuporte ok (2 chamados)');

  // --- responder chamado ---
  window.abrirTicket('ch1');
  document.getElementById('ticket-reply').value = 'Vou verificar isso pra você';
  await window.enviarResposta();
  const ch1 = db.chamados.find(c=>c.id==='ch1');
  if(ch1.status !== 'respondido' || ch1.resposta !== 'Vou verificar isso pra você'){
    console.error('[colab] FALHOU: responder chamado', ch1);
    process.exit(1);
  }
  console.log('[colab] responder chamado ok → status', ch1.status);

  // --- encerrar ---
  await window.encerrarChamado();
  if(db.chamados.find(c=>c.id==='ch1').status !== 'fechado'){ console.error('[colab] FALHOU: encerrar'); process.exit(1); }
  console.log('[colab] encerrar chamado ok');

  // --- tropas & motoristas: alternar acesso ---
  await window.renderTropas();
  await window.alternarAcesso('a1');
  const a1Bloq = db.assinantes.find(a=>a.id==='a1');
  if(a1Bloq.ativo !== false || a1Bloq.status !== 'atrasado'){ console.error('[colab] FALHOU: cancelar acesso', a1Bloq); process.exit(1); }
  console.log('[colab] alternarAcesso ok (a1 cancelado)');
  await window.alternarAcesso('a1');
  const a1Lib = db.assinantes.find(a=>a.id==='a1');
  if(a1Lib.ativo !== true || a1Lib.status !== 'pago'){ console.error('[colab] FALHOU: reativar acesso', a1Lib); process.exit(1); }
  console.log('[colab] reativar acesso ok');

  // --- pagamentos: fila visível + confirmar Pix (com comissão) ---
  await window.renderFilaPagamento();
  const filaHTML = document.getElementById('fila-rows').innerHTML;
  if(!filaHTML.includes('Joao') || !filaHTML.includes('Maria')){
    console.error('[colab] FALHOU: fila não mostra os avisos', filaHTML);
    process.exit(1);
  }
  await window.confirmarPagamento('fp1');
  const a1Conf = db.assinantes.find(a=>a.id==='a1');
  if(a1Conf.ativo !== true || a1Conf.status !== 'pago' || !a1Conf.venc){ console.error('[colab] FALHOU: confirmar não liberou', a1Conf); process.exit(1); }
  const p1 = db.parceiros.find(p=>p.id==='p1');
  if(p1.comissao_mes !== 1.49 || p1.comissao_total !== 1.49){ console.error('[colab] FALHOU: comissão não creditada', p1); process.exit(1); }
  if(db.fila_pagamento.some(f=>f.id==='fp1')){ console.error('[colab] FALHOU: aviso não saiu da fila'); process.exit(1); }
  console.log('[colab] confirmar pagamento ok → acesso liberado + comissão R$1,49');

  // --- restrição por tropa: só vê/confirma das tropas marcadas ---
  const col = db.perfis.find(p=>p.id==='u-colab');
  col.todas_tropas = false;
  col.tropa_ids = ['t1'];
  await window.entrar();
  await window.renderFilaPagamento();
  const filaHTML2 = document.getElementById('fila-rows').innerHTML;
  if(filaHTML2.includes('Maria')){ console.error('[colab] FALHOU: viu aviso de tropa não permitida', filaHTML2); process.exit(1); }
  await window.confirmarPagamento('fp2');
  if(!db.fila_pagamento.some(f=>f.id==='fp2')){ console.error('[colab] FALHOU: confirmou aviso de outra tropa'); process.exit(1); }
  console.log('[colab] restrição por tropa ok → não vê nem confirma de outra tropa');

  // --- admin também entra como colaborador (modo teste, todas as tropas) ---
  db.perfis.push({ id:'u-admin', nome:'Admin Master', papel:'admin', email:'admin@x.com', todas_tropas:true, tropa_ids:[] });
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-admin', email } }, error:null });
  document.getElementById('login-email').value = 'admin@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrar();
  const nomeColab = document.getElementById('colab-ativo-nome').textContent;
  if(!nomeColab.includes('ADMIN')){
    console.error('[colab] FALHOU: admin não entrou como colaborador', nomeColab);
    process.exit(1);
  }
  await window.renderTropas();
  const tropasHTML = document.getElementById('tropas-wrap').innerHTML;
  if(!tropasHTML.includes('TROPA DO CARLOS') || !tropasHTML.includes('TROPA DA MARIA')){
    console.error('[colab] FALHOU: admin não vê todas as tropas', tropasHTML);
    process.exit(1);
  }
  console.log('[colab] admin entra como colaborador (teste) ok → vê todas as tropas');

  console.log('\n=== TESTES COLABORADOR PASSARAM ===');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error('FALHA:', e && e.stack || e); process.exit(1); });
