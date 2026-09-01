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
    parceiros: [], candidatos: [],
    assinantes: [
      { id:'a1', nome:'Joao', tropa_id:'t1', status:'pago', ativo:true, historico:[] },
      { id:'a2', nome:'Maria', tropa_id:'t2', status:'pago', ativo:true, historico:[] },
      { id:'a3', nome:'Pedro', tropa_id:null, status:'pago', ativo:true, historico:[] },
    ],
    fila_pagamento: [], alertas_fraude: [], ranking_regiao: [], premios: [],
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
  if(db.assinantes.find(a=>a.id==='a1').ativo !== false){ console.error('[colab] FALHOU: cancelar acesso'); process.exit(1); }
  console.log('[colab] alternarAcesso ok (a1 cancelado)');
  await window.alternarAcesso('a1');
  if(db.assinantes.find(a=>a.id==='a1').ativo !== true){ console.error('[colab] FALHOU: reativar acesso'); process.exit(1); }
  console.log('[colab] reativar acesso ok');

  console.log('\n=== TESTES COLABORADOR PASSARAM ===');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error('FALHA:', e && e.stack || e); process.exit(1); });
