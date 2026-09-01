// Teste do painel Admin (Supabase)
const { setup, loadPanelScript } = require('./test_harness');

function seedDb(){
  return {
    perfis: [
      { id:'u-default', nome:'Admin Master', papel:'admin', email:'admin@drivewin.com', todas_tropas:true, tropa_ids:[] },
      { id:'u-colab', nome:'Colab', papel:'motorista', email:'colab@drivewin.com', todas_tropas:false, tropa_ids:[] },
    ],
    tropas: [], parceiros: [], candidatos: [{ id:'c1', nome:'Carlos', perfil:'Indicado' }],
    assinantes: [], fila_pagamento: [], alertas_fraude: [], ranking_regiao: [], premios: [], chamados: [],
    lancamentos: [], metas: [],
    financeiro: [{ id:1, receita_bruta:0, comissoes_pagas:0, premiacao_paga:0, data_lancamento:'2026-09-01' }],
    auditoria: [],
  };
}

async function main(){
  const { document, db, auth } = setup(seedDb);
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-default', email } }, error:null });

  loadPanelScript('painel-admin.html');

  // --- login ---
  document.getElementById('login-email').value = 'admin@drivewin.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrar();
  if(document.getElementById('login').style.display !== 'none'){
    console.error('[admin] FALHOU: login nao escondeu tela');
    process.exit(1);
  }
  console.log('[admin] login ok');

  // --- vender acesso ---
  const sel = document.getElementById('na-tropa');
  sel.options.push({ value:'t1', text:'Tropa A' });
  document.getElementById('na-nome').value = 'Joao';
  document.getElementById('na-tropa').value = 't1';
  document.getElementById('na-status').value = 'pago';
  await window.salvarNovoAssinante();
  if(db.assinantes.length !== 1){ console.error('[admin] FALHOU: assinante nao inserido', db.assinantes); process.exit(1); }
  console.log('[admin] vender acesso ok →', db.assinantes[0].nome);

  // --- criar parceiro (aprovando candidato c1) ---
  window.abrirNovoParceiro('c1');
  document.getElementById('np-nome').value = 'Carlos';
  document.getElementById('np-cupom').value = 'CAR123';
  document.getElementById('np-tropa').value = 'Tropa do Carlos';
  document.getElementById('np-assinantes').value = 0;
  await window.salvarNovoParceiro();
  if(db.tropas.length !== 1 || db.parceiros.length !== 1){ console.error('[admin] FALHOU: parceiro/tropa', db.tropas, db.parceiros); process.exit(1); }
  if(db.candidatos.length !== 0){ console.error('[admin] FALHOU: candidato aprovado nao removido'); process.exit(1); }
  console.log('[admin] criar parceiro ok → tropa', db.tropas[0].nome, 'cupom', db.parceiros[0].cupom);

  // --- auditoria ---
  if(!db.auditoria.length){ console.error('[admin] FALHOU: auditoria vazia'); process.exit(1); }
  console.log('[admin] auditoria ok →', db.auditoria.length, 'registros');

  // --- colaborador (promover perfil existente) ---
  document.getElementById('nc-nome').value = 'Colab';
  document.getElementById('nc-email').value = 'colab@drivewin.com';
  document.getElementById('nc-acesso').value = 'todas';
  await window.salvarNovoColaborador();
  const colab = db.perfis.find(p=>p.id==='u-colab');
  if(!colab || colab.papel !== 'colaborador'){ console.error('[admin] FALHOU: colaborador nao promovido', colab); process.exit(1); }
  console.log('[admin] cadastrar colaborador ok');

  // --- excluir colaborador (rebaixa p/ motorista) ---
  await window.excluirColaborador('u-colab');
  if(db.perfis.find(p=>p.id==='u-colab').papel !== 'motorista'){ console.error('[admin] FALHOU: colaborador nao removido'); process.exit(1); }
  console.log('[admin] excluir colaborador ok');

  // --- toggle acesso + confirmar pagamento ---
  await window.toggleAcesso(db.assinantes[0].id);
  if(db.assinantes[0].status !== 'atrasado'){ console.error('[admin] FALHOU: toggle acesso'); process.exit(1); }
  db.fila_pagamento.push({ id:'f1', assinante:'Joao', valor:50, motivo:'mensalidade' });
  await window.loadAll();
  await window.confirmarPagamento('f1');
  if(db.assinantes[0].status !== 'pago' || db.fila_pagamento.length !== 0){ console.error('[admin] FALHOU: confirmar pagamento'); process.exit(1); }
  console.log('[admin] toggle acesso + confirmar pagamento ok');

  console.log('\n=== TESTES ADMIN PASSARAM ===');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error('FALHA:', e && e.message); process.exit(1); });
