// ATENÇÃO: Substitua pelas MESMAS chaves do seu sistema interno!
const SUPABASE_URL = 'https://uogorpanshybcuhdekhg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZ29ycGFuc2h5YmN1aGRla2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTcxNzYsImV4cCI6MjA3NTE5MzE3Nn0.LSGlAeeLZsPnEw3GtEXzY4D9f3UZhk7SXyBgrGYaKMg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let parceiroLogado = null;

document.addEventListener('DOMContentLoaded', async () => {
    const sessionStr = localStorage.getItem('bel_parceiro_session');
    if (sessionStr) {
        parceiroLogado = JSON.parse(sessionStr);
        mostrarPortal();
    } else {
        await carregarEmpresasNoLogin();
    }
});

async function carregarEmpresasNoLogin() {
    const select = document.getElementById('login-empresa');
    try {
        const { data, error } = await supabaseClient.from('proprietarios').select('id, nome').order('nome');
        if (error) throw error;
        select.innerHTML = '<option value="">Selecione sua empresa...</option>' + data.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    } catch (err) { select.innerHTML = '<option value="">Erro ao carregar empresas</option>'; }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const empresaId = document.getElementById('login-empresa').value;
    const token = document.getElementById('login-token').value;

    btn.innerHTML = '<i class="ph-fill ph-spinner-gap"></i> Validando...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.from('proprietarios').select('id, nome').eq('id', empresaId).eq('token_acesso', token).single();
        if (error || !data) throw new Error('Empresa ou token inválidos.');

        parceiroLogado = data;
        localStorage.setItem('bel_parceiro_session', JSON.stringify(data));
        mostrarPortal();
    } catch (err) {
        alert('Falha no acesso. Verifique se a senha está correta.');
    } finally {
        btn.innerHTML = '<i class="ph-fill ph-sign-in"></i> Entrar no Sistema';
        btn.disabled = false;
    }
});

document.getElementById('btn-sair').addEventListener('click', () => {
    localStorage.removeItem('bel_parceiro_session');
    parceiroLogado = null;
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('login-token').value = '';
});

function mostrarPortal() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('nome-empresa-logada').textContent = parceiroLogado.nome;
    carregarDados();
}

function carregarDados() {
    carregarMeusEquipamentos();
    carregarMeusFuncionarios();
}

// Navegação 4 Abas
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById(e.currentTarget.getAttribute('data-tab')).classList.add('active');
    });
});

// Campos dinâmicos de Reboque
document.getElementById('eq-categoria').addEventListener('change', (e) => {
    const val = e.target.value;
    const container = document.getElementById('reboques-container');
    const reb1 = document.getElementById('grupo-reb1');
    const reb2 = document.getElementById('grupo-reb2');

    if (val === 'Rodotrem') {
        container.style.display = 'block';
        reb1.style.display = 'flex';
        reb2.style.display = 'none';
    } else if (val === 'Treminhão') {
        container.style.display = 'block';
        reb1.style.display = 'flex';
        reb2.style.display = 'flex';
    } else {
        container.style.display = 'none';
        reb1.style.display = 'none';
        reb2.style.display = 'none';
    }
});

// --- SALVANDO VEÍCULOS ---
document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoria = document.getElementById('eq-categoria').value;
    const placa = document.getElementById('eq-placa').value.toUpperCase();
    const modelo = document.getElementById('eq-modelo').value;
    const reb1 = document.getElementById('eq-reb1-placa').value.toUpperCase();
    const reb2 = document.getElementById('eq-reb2-placa').value.toUpperCase();

    // Simulação do Upload de Arquivos
    const hasDocPrincipal = document.getElementById('eq-doc-principal').files.length > 0;
    const hasDocR1 = document.getElementById('eq-reb1-doc').files.length > 0;
    const hasDocR2 = document.getElementById('eq-reb2-doc').files.length > 0;

    const isCaminhao = ['Caminhão Simples', 'Rodotrem', 'Treminhão'].includes(categoria);
    const tabelaDestino = isCaminhao ? 'caminhoes' : 'equipamentos';

    // REGRA RÍGIDA DE PENDÊNCIA
    let statusFinal = 'Pendente Vistoria'; 
    if (categoria === 'Rodotrem' && (!reb1 || !hasDocR1)) statusFinal = 'Cadastro Incompleto';
    if (categoria === 'Treminhão' && (!reb1 || !reb2 || !hasDocR1 || !hasDocR2)) statusFinal = 'Cadastro Incompleto';

    try {
        const payload = { 
            proprietario_id: parceiroLogado.id,
            placa: placa, // A usina que colocará o cod_equipamento depois
            descricao: `[${categoria}] ${modelo}`,
            status_homologacao: statusFinal,
            situacao: 'inativo' 
        };

        if (isCaminhao) {
            payload.configuracao = categoria;
            payload.reboque1_placa = reb1 || null;
            payload.reboque2_placa = reb2 || null;
        }

        await supabaseClient.from(tabelaDestino).insert([payload]);
        
        if(statusFinal === 'Cadastro Incompleto') {
            alert('Atenção: Salvo como RASCUNHO. O veículo só irá para vistoria após anexar todas as placas e documentos dos reboques.');
        } else {
            alert('Documentos enviados! O veículo está aguardando vistoria da Usina.');
        }
        
        e.target.reset();
        document.getElementById('reboques-container').style.display = 'none';
        carregarMeusEquipamentos();
    } catch (err) { alert('Erro ao cadastrar.'); console.error(err); }
});

// --- SALVANDO FUNCIONÁRIO ---
document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const docAnexado = document.getElementById('func-doc').files.length > 0;

    try {
        await supabaseClient.from('terceiros').insert([{ 
            empresa_id: parceiroLogado.id,
            nome: document.getElementById('func-nome').value,
            cpf_cnpj: document.getElementById('func-cpf').value,
            descricao_atividade: document.getElementById('func-cargo').value,
            status_homologacao: docAnexado ? 'Falta Integração' : 'Cadastro Incompleto',
            situacao: 'inativo' 
        }]);
        alert('Cadastro enviado! Aguarde a integração da usina.');
        e.target.reset();
        carregarMeusFuncionarios();
    } catch (err) { alert('Erro ao cadastrar.'); console.error(err); }
});

// --- REGRAS DE EXIBIÇÃO ---
function getStatusClass(status) {
    const v = status || '';
    if (v.includes('Apto') || v.includes('Ativo') || v.includes('Integrado')) return 'status-apto';
    if (v.includes('Incompleto')) return 'status-incompleto';
    if (v.includes('Inativo') || v.includes('Falta')) return 'status-inativo';
    return 'status-pendente';
}

function renderBadge(status) {
    const v = status || 'Pendente';
    let bg = 'rgba(245, 158, 11, 0.1)', color = 'var(--warning)', border = '#FCD34D'; 
    if (v.includes('Apto') || v.includes('Ativo') || v.includes('Integrado')) {
        bg = 'rgba(16, 185, 129, 0.1)'; color = 'var(--success)'; border = '#6EE7B7';
    } else if (v.includes('Incompleto')) {
        bg = 'rgba(148, 163, 184, 0.1)'; color = '#64748B'; border = '#CBD5E1'; 
    } else if (v.includes('Inativo') || v.includes('Falta')) {
        bg = 'rgba(239, 68, 68, 0.1)'; color = 'var(--danger)'; border = '#FCA5A5';
    }
    return `<span class="status-badge" style="background: ${bg}; color: ${color}; border: 1px solid ${border};">${v}</span>`;
}

function getIconForType(tipo) {
    if (['Rodotrem', 'Treminhão'].includes(tipo)) return 'ph-truck-trailer';
    if (['Colhedora', 'Carregadeira', 'Trator Reboque', 'Trator Transbordo', 'Máquina Agrícola'].includes(tipo)) return 'ph-tractor';
    return 'ph-truck'; 
}

function isAtivo(item) {
    return item.situacao === 'ativo' && (item.status_homologacao.includes('Apto') || item.status_homologacao.includes('Integrado'));
}

async function carregarMeusEquipamentos() {
    const contPendente = document.getElementById('lista-frota-pendente');
    const contAtivo = document.getElementById('lista-frota-ativa');
    contPendente.innerHTML = contAtivo.innerHTML = '<div class="empty-state"><i class="ph ph-spinner-gap ph-spin"></i> Buscando...</div>';

    try {
        const [camRes, eqRes] = await Promise.all([
            supabaseClient.from('caminhoes').select('*').eq('proprietario_id', parceiroLogado.id),
            supabaseClient.from('equipamentos').select('*').eq('proprietario_id', parceiroLogado.id)
        ]);

        let frota = [];
        if (camRes.data) frota = [...frota, ...camRes.data.map(c => ({...c, _tabela: 'caminhoes', _tipoDefault: 'Caminhão'}))];
        if (eqRes.data) frota = [...frota, ...eqRes.data.map(e => ({...e, _tabela: 'equipamentos', _tipoDefault: 'Máquina Agrícola'}))];

        frota = frota.filter(item => item.situacao !== 'excluído pelo parceiro');

        const ativos = frota.filter(f => isAtivo(f));
        const pendentes = frota.filter(f => !isAtivo(f));

        const renderItem = (item) => {
            let cat = item._tipoDefault;
            let desc = item.descricao || '-';
            const match = desc.match(/^\[(.*?)\]\s*(.*)$/);
            if (match) { cat = match[1]; desc = match[2]; }

            const classStatus = getStatusClass(item.status_homologacao);
            const conf = item.configuracao || cat;
            
            // O Código da Usina (Se ainda não tiver, mostra que está aguardando)
            let codUsinaHtml = '';
            if (item.cod_equipamento && item.cod_equipamento !== item.placa) {
                codUsinaHtml = `<span style="background: rgba(37,99,235,0.1); color: var(--primary-color); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">Cód Usina: ${item.cod_equipamento}</span>`;
            } else {
                codUsinaHtml = `<span style="color: var(--warning); font-size: 0.75rem; font-style: italic;">Aguardando Cód. Usina</span>`;
            }

            // Alertas de Pendências
            let alertas = '';
            if (item.status_homologacao === 'Cadastro Incompleto') alertas += `<div class="missing-alert"><i class="ph-fill ph-warning"></i> Faltam Placas ou Docs de Reboques</div>`;
            else if (item.status_homologacao === 'Pendente Vistoria') alertas += `<div class="missing-alert" style="color: var(--warning);"><i class="ph-fill ph-clock"></i> Aguardando vistoria da Usina</div>`;

            let htmlReboques = '';
            if (item._tabela === 'caminhoes' && (conf === 'Rodotrem' || conf === 'Treminhão')) {
                const r1 = item.reboque1_placa ? `<strong>${item.reboque1_placa}</strong>` : `<span style="color:var(--danger);">Falta Preencher</span>`;
                const r2 = conf === 'Treminhão' ? (item.reboque2_placa ? ` | Reb 2: <strong>${item.reboque2_placa}</strong>` : ` | Reb 2: <span style="color:var(--danger);">Falta Preencher</span>`) : '';
                htmlReboques = `<div style="margin-top: 8px; font-size: 0.8rem; background: #F1F5F9; padding: 6px 10px; border-radius: 6px; border: 1px dashed #CBD5E1; color: var(--text-muted);">Reb 1: ${r1} ${r2}</div>`;
            }

            return `
            <div class="list-item ${classStatus}">
                <div class="item-main">
                    <div class="item-icon"><i class="ph-fill ${getIconForType(conf)}"></i></div>
                    <div class="item-details" style="width: 100%;">
                        <span class="item-tag">${conf}</span>
                        <span class="item-title">Placa: ${item.placa || 'N/A'} ${codUsinaHtml}</span>
                        <span class="item-subtitle">${desc}</span>
                        ${htmlReboques}
                        ${alertas}
                    </div>
                </div>
                <div class="item-status">
                    ${renderBadge(item.status_homologacao)}
                </div>
                <div class="item-actions">
                    <button class="btn-icon" title="Editar / Completar Dados" onclick="abrirModalEdicao('${item.id}', '${item._tabela}', '${item.placa}', '${desc}', '${conf}', '${item.reboque1_placa || ''}', '${item.reboque2_placa || ''}')"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon" title="Anexar Documento" onclick="abrirModalAnexo('${conf}')"><i class="ph ph-paperclip"></i></button>
                    <button class="btn-icon danger" title="Remover" onclick="excluirItem('${item.id}', '${item._tabela}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>`;
        };

        contPendente.innerHTML = pendentes.length > 0 ? pendentes.map(renderItem).join('') : '<div class="empty-state">Nenhuma pendência na frota.</div>';
        contAtivo.innerHTML = ativos.length > 0 ? ativos.map(renderItem).join('') : '<div class="empty-state">Nenhum veículo rodando no momento.</div>';
    } catch(e) { console.error(e); }
}

async function carregarMeusFuncionarios() {
    const contPendente = document.getElementById('lista-equipe-pendente');
    const contAtivo = document.getElementById('lista-equipe-ativa');
    contPendente.innerHTML = contAtivo.innerHTML = '<div class="empty-state"><i class="ph ph-spinner-gap ph-spin"></i> Buscando...</div>';

    try {
        const { data } = await supabaseClient.from('terceiros').select('*').eq('empresa_id', parceiroLogado.id);
        let equipe = data ? data.filter(item => item.situacao !== 'excluído pelo parceiro') : [];
        
        const ativos = equipe.filter(f => isAtivo(f));
        const pendentes = equipe.filter(f => !isAtivo(f));

        const renderItem = (f) => {
            const classStatus = getStatusClass(f.status_homologacao);
            let alertas = '';
            if (f.status_homologacao === 'Cadastro Incompleto') alertas = `<div class="missing-alert"><i class="ph-fill ph-warning"></i> Falta Anexar Documento</div>`;
            else if (f.status_homologacao === 'Falta Integração') alertas = `<div class="missing-alert" style="color: var(--warning);"><i class="ph-fill ph-clock"></i> Aguardando Usina</div>`;

            return `
            <div class="list-item ${classStatus}">
                <div class="item-main">
                    <div class="item-icon" style="background: #EEF2FF; color: #3B82F6;"><i class="ph-fill ph-user"></i></div>
                    <div class="item-details">
                        <span class="item-tag">${f.descricao_atividade || 'Colaborador'}</span>
                        <span class="item-title">${f.nome}</span>
                        <span class="item-subtitle">CPF: ${f.cpf_cnpj || 'Não informado'}</span>
                        ${alertas}
                    </div>
                </div>
                <div class="item-status">${renderBadge(f.status_homologacao)}</div>
                <div class="item-actions">
                    <button class="btn-icon" title="Editar" onclick="abrirModalEdicao('${f.id}', 'terceiros', '${f.nome}', '${f.descricao_atividade}', '', '', '')"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon" title="Anexar Doc Faltante" onclick="abrirModalAnexo('Funcionario')"><i class="ph ph-paperclip"></i></button>
                    <button class="btn-icon danger" title="Remover" onclick="excluirItem('${f.id}', 'terceiros')"><i class="ph ph-trash"></i></button>
                </div>
            </div>`;
        };

        contPendente.innerHTML = pendentes.length > 0 ? pendentes.map(renderItem).join('') : '<div class="empty-state">Nenhuma pendência na equipe.</div>';
        contAtivo.innerHTML = ativos.length > 0 ? ativos.map(renderItem).join('') : '<div class="empty-state">Nenhum colaborador ativo no momento.</div>';
    } catch(e) { console.error(e); }
}

// --- FUNÇÕES DE AÇÃO ---
window.excluirItem = async function(id, tabela) {
    if (!confirm('Deseja realmente remover este item? Ele sairá da Vistoria da Usina.')) return;
    try {
        await supabaseClient.from(tabela).update({ situacao: 'excluído pelo parceiro' }).eq('id', id);
        if (tabela === 'terceiros') carregarMeusFuncionarios(); else carregarMeusEquipamentos();
    } catch (err) { alert('Erro ao remover.'); }
}

// Modal de Anexos
window.abrirModalAnexo = function(configuracao) {
    const select = document.getElementById('tipo-anexo');
    const optReb1 = document.getElementById('opt-reb1');
    const optReb2 = document.getElementById('opt-reb2');
    
    if (configuracao === 'Rodotrem') {
        optReb1.style.display = 'block'; optReb2.style.display = 'none';
    } else if (configuracao === 'Treminhão') {
        optReb1.style.display = 'block'; optReb2.style.display = 'block';
    } else {
        optReb1.style.display = 'none'; optReb2.style.display = 'none';
    }
    
    document.getElementById('modal-anexo').style.display = 'flex';
}

window.simularEnvioAnexo = function() {
    const input = document.getElementById('arquivo-upload');
    if (!input.files[0]) return alert("Por favor, selecione um arquivo.");
    alert(`Documento enviado para a usina com sucesso!`);
    input.value = '';
    document.getElementById('modal-anexo').style.display = 'none';
}

// Modal de Edição (Preencher placas faltantes)
window.abrirModalEdicao = function(id, tabela, ident, detalhe, config, reb1, reb2) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-tabela').value = tabela;
    document.getElementById('edit-identificacao').value = ident;
    document.getElementById('edit-detalhe').value = detalhe;
    document.getElementById('edit-config').value = config || ''; 
    
    const divReboques = document.getElementById('modal-edit-reboques');
    if (tabela === 'caminhoes' && (config === 'Rodotrem' || config === 'Treminhão')) {
        divReboques.style.display = 'block';
        document.getElementById('grupo-edit-reb1').style.display = 'flex';
        document.getElementById('edit-reb1').value = (reb1 && reb1 !== 'null') ? reb1 : '';
        
        if (config === 'Treminhão') {
            document.getElementById('grupo-edit-reb2').style.display = 'flex';
            document.getElementById('edit-reb2').value = (reb2 && reb2 !== 'null') ? reb2 : '';
        } else {
            document.getElementById('grupo-edit-reb2').style.display = 'none';
        }
    } else {
        divReboques.style.display = 'none';
    }
    
    document.getElementById('label-edit-identificacao').textContent = tabela === 'terceiros' ? 'Nome Completo' : 'Placa (Cavalo)';
    document.getElementById('label-edit-detalhe').textContent = tabela === 'terceiros' ? 'Cargo / Função' : 'Modelo / Descrição';
    
    document.getElementById('modal-edicao').style.display = 'flex';
}

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => e.target.closest('.modal-overlay').style.display = 'none');
});

document.getElementById('form-edicao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const tabela = document.getElementById('edit-tabela').value;
    const ident = document.getElementById('edit-identificacao').value.toUpperCase();
    const detalhe = document.getElementById('edit-detalhe').value;
    const config = document.getElementById('edit-config').value;
    const reb1 = document.getElementById('edit-reb1').value.toUpperCase();
    const reb2 = document.getElementById('edit-reb2').value.toUpperCase();

    try {
        let payload = {};
        if (tabela === 'terceiros') {
            payload = { nome: ident, descricao_atividade: detalhe };
        } else {
            payload = { placa: ident, descricao: `[${config}] ${detalhe}` }; 
            
            if (config === 'Rodotrem' || config === 'Treminhão') {
                payload.reboque1_placa = reb1 || null;
                payload.reboque2_placa = reb2 || null;
                
                let status = 'Pendente Vistoria';
                if (config === 'Rodotrem' && !reb1) status = 'Cadastro Incompleto';
                if (config === 'Treminhão' && (!reb1 || !reb2)) status = 'Cadastro Incompleto';
                
                payload.status_homologacao = status; 
            }
        }

        await supabaseClient.from(tabela).update(payload).eq('id', id);
        document.getElementById('modal-edicao').style.display = 'none';
        alert('Dados salvos! Se tudo estiver preenchido, já está na fila de Vistoria da Usina.');
        if (tabela === 'terceiros') carregarMeusFuncionarios(); else carregarMeusEquipamentos();
    } catch (err) { alert('Erro ao atualizar.'); }
});