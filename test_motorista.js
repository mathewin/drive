// Teste do app Motorista (Supabase)
const { setup, loadPanelScript } = require('./test_harness');

function seedDb(){
  return {
    perfis: [
      { id:'u-moto', nome:'Joao', papel:'motorista', email:'joao@x.com', todas_tropas:false, tropa_ids:[] },
      { id:'u-moto2', nome:'Pedro', papel:'motorista', email:'pedro@x.com', todas_tropas:false, tropa_ids:[] },
      { id:'u-falso', nome:'Joao', papel:'motorista', email:'falso@x.com', todas_tropas:false, tropa_ids:[] },
      { id:'u-novato', nome:'Novato', papel:'motorista', email:'novato@x.com', todas_tropas:false, tropa_ids:[] },
      { id:'u-carla', nome:'Carla', papel:'motorista', email:'carla@x.com', todas_tropas:false, tropa_ids:[] },
    ],
    tropas: [ { id:'t1', nome:'Tropa do Carlos', ativa:true } ],
    parceiros: [ { id:'p1', nome:'Carlos', cupom:'CAR10', tropa_id:'t1', comissao_mes:0, comissao_total:0 } ],
    candidatos: [],
    assinantes: [
      { id:'a1', nome:'Joao', email:'joao@x.com', tropa_id:'t1', status:'pago', ativo:true, historico:[] },
      { id:'a2', nome:'Pedro', tropa_id:'t1', status:'pago', ativo:false, historico:[] },
      { id:'a3', nome:'Novato', email:'novato@x.com', tropa_id:'t1', status:'pendente', ativo:false, historico:[] },
    ],
    config: [
      { chave:'pix_chave', valor:'novato@pix.com' },
      { chave:'preco_cheio', valor:'29.99' },
      { chave:'preco_parceiro', valor:'21.99' },
      { chave:'comissao_parceiro', valor:'1.49' },
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

  loadPanelScript('painel-motorista.html');

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

  // --- segurança: mesmo nome, e-mail diferente NÃO ganha acesso de graça → vai pra assinatura ---
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-falso', email } }, error:null });
  document.getElementById('login-email').value = 'falso@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrarMotorista();
  if(!document.getElementById('assinar').classList.contains('active')){
    console.error('[moto] FALHOU: impostor não foi direcionado à assinatura');
    process.exit(1);
  }
  console.log('[moto] segurança ok → impostor (mesmo nome, outro e-mail) cai na assinatura, sem acesso de graça');

  // --- fallback legado: assinante sem e-mail é achado pelo nome; Pedro suspenso (ativo=false) bloqueia ---
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-moto2', email } }, error:null });
  document.getElementById('login-email').value = 'pedro@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrarMotorista();
  const erroPedro = document.getElementById('login-erro');
  if(!(erroPedro.style.display === 'block' && (erroPedro.textContent||'').includes('suspenso'))){
    console.error('[moto] FALHOU: Pedro (sem e-mail, ativo=false) não foi bloqueado por suspensão');
    process.exit(1);
  }
  console.log('[moto] fallback nome ok → Pedro (sem e-mail) encontrado e bloqueado por suspensão');

  // --- fluxo Pix: pendente cai na tela de pagamento, vê a chave e avisa ---
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-novato', email } }, error:null });
  document.getElementById('login-email').value = 'novato@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrarMotorista();
  if(!document.getElementById('pagar').classList.contains('active')){
    console.error('[moto] FALHOU: pendente não foi pra tela de pagamento');
    process.exit(1);
  }
  if(document.getElementById('pix-chave').textContent !== 'novato@pix.com'){
    console.error('[moto] FALHOU: chave pix não exibida na tela', document.getElementById('pix-chave').textContent);
    process.exit(1);
  }
  await window.avisarPagamento();
  const aviso = db.fila_pagamento.find(x => x.assinante === 'Novato');
  if(!aviso || aviso.motivo !== 'Pix via app'){
    console.error('[moto] FALHOU: aviso de pagamento não criado', db.fila_pagamento);
    process.exit(1);
  }
  console.log('[moto] fluxo pix ok → pendente vê chave e avisa pagamento');

  // --- assinatura com código de parceiro (novo motorista) ---
  auth.signInWithPassword = async ({email,password}) => ({ data:{ user:{ id:'u-carla', email } }, error:null });
  document.getElementById('login-email').value = 'carla@x.com';
  document.getElementById('login-senha').value = 'senha';
  await window.entrarMotorista();
  if(!document.getElementById('assinar').classList.contains('active')){
    console.error('[moto] FALHOU: Carla sem assinatura não foi pra tela de assinar');
    process.exit(1);
  }
  document.getElementById('ass-cupom').value = 'CAR10';
  await window.calcularPrecoAssinatura();
  if(!document.getElementById('ass-valor').textContent.includes('21,99')){
    console.error('[moto] FALHOU: desconto do parceiro não aplicado', document.getElementById('ass-valor').textContent);
    process.exit(1);
  }
  await window.assinarComPix();
  const carla = db.assinantes.find(a => a.email === 'carla@x.com');
  if(!carla || carla.status !== 'pendente' || carla.ativo !== false || carla.tropa_id !== 't1' || carla.cupom !== 'CAR10' || carla.valor !== 21.99){
    console.error('[moto] FALHOU: assinatura com código de parceiro errada', carla);
    process.exit(1);
  }
  if(!document.getElementById('pagar').classList.contains('active')){
    console.error('[moto] FALHOU: depois de assinar não foi pro pagamento');
    process.exit(1);
  }
  console.log('[moto] assinatura com código ok → pendente, tropa do Carlos, R$21,99');

  console.log('\n=== TESTES MOTORISTA PASSARAM ===');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error('FALHA:', e && e.stack || e); process.exit(1); });
