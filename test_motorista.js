// Teste do app Motorista (Supabase)
const { setup, loadPanelScript } = require('./test_harness');

function seedDb(){
  return {
    perfis: [
      { id:'u-moto', nome:'Joao', papel:'motorista', email:'joao@x.com', todas_tropas:false, tropa_ids:[] },
      { id:'u-moto2', nome:'Pedro', papel:'motorista', email:'pedro@x.com', todas_tropas:false, tropa_ids:[] },
    ],
    tropas: [ { id:'t1', nome:'Tropa do Carlos', ativa:true } ],
    parceiros: [], candidatos: [],
    assinantes: [
      { id:'a1', nome:'Joao', tropa_id:'t1', status:'pago', ativo:true, historico:[] },
      { id:'a2', nome:'Pedro', tropa_id:'t1', status:'pago', ativo:false, historico:[] },
    ],
    fila_pagamento: [], alertas_fraude: [], ranking_regiao: [], premios: [],
    chamados: [],
    lancamentos: [
      { usuario_id:'u-moto', data:'2026-08-31', corridas:0, km:80, horas:6, bruto:300, gasolina:80, apps:0, rede:0, alimentacao:25, total:195, nota:null,
        dados:{ uber:200, n99:100, promo:0, outroApp:0, combustivelTipo:'gasolina', precoLitro:5.8, carro:0, lavagem:0, outros:0 } },
    ],
    metas: [ { usuario_id:'u-moto', diaria:250, semanal:1500, mensal:6000, horas:8, km:1.5, dias:6, atualizado_em:'2026-09-01' } ],
    financeiro: [{ id:1, receita_bruta:0, comissoes_pagas:0, premiacao_paga:0, data_lancamento:'2026-09-01' }],
    auditoria: [],
  };
}

async function main(){
  const { document, db, auth } = setup(seedDb);
  // login do Joao
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-moto', email } }, error:null });

  loadPanelScript('painel-motorista-preview_mais_novo.html');

  // --- login (sem cadastro) ---
  document.getElementById('login-email').value = 'joao@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrarMotorista();
  if(document.getElementById('login').classList.contains('active')){
    console.error('[moto] FALHOU: login nao saiu da tela');
    process.exit(1);
  }
  console.log('[moto] login ok → nome', window.meuNomeAtual());

  // dados carregados do banco
  const registros = window.getLancamentos();
  if(!registros['2026-08-31'] || registros['2026-08-31'].uber !== 200){
    console.error('[moto] FALHOU: lancamentos nao carregados', registros);
    process.exit(1);
  }
  if(window.getMeta() !== 250){ console.error('[moto] FALHOU: meta nao carregada'); process.exit(1); }
  console.log('[moto] dados carregados ok (lancamento + meta diaria)');

  // --- salvar novo lançamento ---
  document.getElementById('in-data').value = '2026-09-01';
  document.getElementById('in-uber').value = '150';
  document.getElementById('in-99').value = '80';
  document.getElementById('in-km').value = '60';
  document.getElementById('in-horas').value = '5';
  document.getElementById('in-combustivel').value = '50';
  document.getElementById('in-precolitro').value = '5.8';
  document.getElementById('in-alimentacao').value = '20';
  document.getElementById('btn-salvar').click();
  await new Promise(r => setTimeout(r, 30));
  const novo = db.lancamentos.find(l => l.data === '2026-09-01' && l.usuario_id === 'u-moto');
  if(!novo){ console.error('[moto] FALHOU: lancamento novo nao salvo', db.lancamentos); process.exit(1); }
  if(novo.bruto !== 230 || novo.total !== 160){ console.error('[moto] FALHOU: valores do lancamento', novo); process.exit(1); }
  console.log('[moto] salvar lançamento ok → bruto', novo.bruto, '| total', novo.total);

  // --- atualizar lançamento existente (upsert) ---
  document.getElementById('in-data').value = '2026-08-31';
  await window.editarLancamento('2026-08-31');
  document.getElementById('in-uber').value = '220';
  document.getElementById('btn-salvar').click();
  await new Promise(r => setTimeout(r, 30));
  const ups = db.lancamentos.filter(l => l.data === '2026-08-31' && l.usuario_id === 'u-moto');
  if(ups.length !== 1){ console.error('[moto] FALHOU: upsert duplicou registro', ups); process.exit(1); }
  if(ups[0].dados.uber !== 220){ console.error('[moto] FALHOU: upsert nao atualizou', ups[0]); process.exit(1); }
  console.log('[moto] upsert ok → uber atualizado p/ 220');

  // --- excluir lançamento ---
  await window.excluirLancamento('2026-08-31');
  if(db.lancamentos.some(l => l.data === '2026-08-31' && l.usuario_id === 'u-moto')){
    console.error('[moto] FALHOU: excluir lancamento'); process.exit(1);
  }
  console.log('[moto] excluir lançamento ok');

  // --- abrir chamado ---
  window.abrirNovoTicket();
  document.getElementById('nt-assunto').value = 'Ajuda com app';
  document.getElementById('nt-mensagem').value = 'Não consigo lançar';
  await window.enviarNovoTicket();
  const ch = db.chamados.find(c => c.nome === 'Joao');
  if(!ch || ch.status !== 'aberto' || ch.assunto !== 'Ajuda com app' || ch.tropa !== 'Tropa do Carlos'){
    console.error('[moto] FALHOU: abrir chamado', ch);
    process.exit(1);
  }
  console.log('[moto] abrir chamado ok → tropa', ch.tropa);

  console.log('\n=== TESTES MOTORISTA PASSARAM ===');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error('FALHA:', e && e.stack || e); process.exit(1); });
