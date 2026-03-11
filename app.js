// ==========================================================
// CONFIGURAÇÃO SUPABASE
// ==========================================================
const SUPABASE_URL = 'https://uogorpanshybcuhdekhg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZ29ycGFuc2h5YmN1aGRla2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTcxNzYsImV4cCI6MjA3NTE5MzE3Nn0.LSGlAeeLZsPnEw3GtEXzY4D9f3UZhk7SXyBgrGYaKMg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let parceiroLogado = null;

// ==========================================================
// INICIALIZAÇÃO & AUTENTICAÇÃO
// ==========================================================
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
        select.innerHTML = '<option value="">Selecione a parceira logística...</option>' + 
            data.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    } catch (err) { 
        select.innerHTML = '<option value="">Falha na conexão com banco de dados</option>'; 
    }
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const empresaId = document.getElementById('login-empresa').value;
    const token = document.getElementById('login-token').value;

    btn.innerHTML = '<i class="ph-fill ph-spinner-gap ph-spin"></i> Autenticando...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.from('proprietarios').select('id, nome').eq('id', empresaId).eq('token_acesso', token).single();
        if (error || !data) throw new Error('Acesso negado');

        parceiroLogado = data;
        localStorage.setItem('bel_parceiro_session', JSON.stringify(data));
        
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Bem-vindo à Torre, ${data.nome}`, showConfirmButton: false, timer: 2000 });
        mostrarPortal();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Falha no Acesso', text: 'Token de segurança inválido ou empresa incorreta.' });
    } finally {
        btn.innerHTML = '<i class="ph-fill ph-sign-in"></i> Entrar na Operação';
        btn.disabled = false;
    }
});

document.getElementById('btn-sair').addEventListener('click', () => {
    Swal.fire({
        title: 'Sair do Sistema?',
        text: "Sua sessão na torre de controle será encerrada.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0F172A',
        cancelButtonColor: '#EF4444',
        confirmButtonText: 'Sim, sair'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('bel_parceiro_session');
            window.location.reload();
        }
    });
});

function mostrarPortal() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('nome-empresa-logada').textContent = parceiroLogado.nome;
    carregarDadosBase();
}

// ==========================================================
// UPLOAD DE ARQUIVOS (Supabase Storage)
// ==========================================================
async function fazerUploadParaStorage(arquivo, pastaDestino) {
    if (!arquivo) return null;
    try {
        const fileExt = arquivo.name.split('.').pop();
        const fileName = `${pastaDestino}_${Date.now()}.${fileExt}`;
        const filePath = `${parceiroLogado.id}/${fileName}`;
        
        const { error } = await supabaseClient.storage.from('documentos_logistica').upload(filePath, arquivo);
        if (error) throw error;
        
        const { data } = supabaseClient.storage.from('documentos_logistica').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (e) {
        console.warn("Aviso de Storage: O upload falhou.", e);
        return 'upload_pendente_ou_simulado'; 
    }
}

// ==========================================================
// INTERFACE E NAVEGAÇÃO
// ==========================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById(e.currentTarget.getAttribute('data-tab')).classList.add('active');
    });
});

document.getElementById('eq-categoria').addEventListener('change', (e) => {
    const val = e.target.value;
    const container = document.getElementById('reboques-container');
    const reb1 = document.getElementById('grupo-reb1');
    const reb2 = document.getElementById('grupo-reb2');

    if (val === 'Rodotrem') {
        container.style.display = 'block'; reb1.style.display = 'flex'; reb2.style.display = 'none';
    } else if (val === 'Treminhão') {
        container.style.display = 'block'; reb1.style.display = 'flex'; reb2.style.display = 'flex';
    } else {
        container.style.display = 'none'; reb1.style.display = 'none'; reb2.style.display = 'none';
    }
});

function skeletonHTML() {
    return `<div class="skeleton-box"></div><div class="skeleton-box"></div>`;
}

// ==========================================================
// CADASTRO DE DADOS DA OPERAÇÃO
// ==========================================================
document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-equipamento');
    const categoria = document.getElementById('eq-categoria').value;
    const placa = document.getElementById('eq-placa').value.toUpperCase();
    const modelo = document.getElementById('eq-modelo').value;
    const reb1 = document.getElementById('eq-reb1-placa').value.toUpperCase();
    const reb2 = document.getElementById('eq-reb2-placa').value.toUpperCase();

    const filePrincipal = document.getElementById('eq-doc-principal').files[0];
    const fileR1 = document.getElementById('eq-reb1-doc').files[0];
    const fileR2 = document.getElementById('eq-reb2-doc').files[0];

    btn.disabled = true; btn.innerHTML = '<i class="ph-fill ph-spinner-gap ph-spin"></i> Processando...';

    try {
        const isCaminhao = ['Caminhão Simples', 'Rodotrem', 'Treminhão'].includes(categoria);
        const tabelaDestino = isCaminhao ? 'caminhoes' : 'equipamentos';

        let statusFinal = 'Pendente Vistoria'; 
        if (categoria === 'Rodotrem' && (!reb1 || !fileR1)) statusFinal = 'Cadastro Incompleto';
        if (categoria === 'Treminhão' && (!reb1 || !reb2 || !fileR1 || !fileR2)) statusFinal = 'Cadastro Incompleto';

        await fazerUploadParaStorage(filePrincipal, `doc_${placa}`);
        if (fileR1) await fazerUploadParaStorage(fileR1, `doc_${reb1}`);
        if (fileR2) await fazerUploadParaStorage(fileR2, `doc_${reb2}`);

        const payload = { 
            proprietario_id: parceiroLogado.id,
            placa: placa,
            descricao: `[${categoria}] ${modelo}`,
            status_homologacao: statusFinal,
            situacao: 'inativo' 
        };

        if (isCaminhao) {
            payload.configuracao = categoria;
            payload.reboque1_placa = reb1 || null;
            payload.reboque2_placa = reb2 || null;
        }

        const { error } = await supabaseClient.from(tabelaDestino).insert([payload]);
        if (error) throw error;
        
        if(statusFinal === 'Cadastro Incompleto') {
            Swal.fire({ icon: 'warning', title: 'Salvo como Rascunho', text: 'Anexe as placas e docs dos reboques para enviar à Usina.' });
        } else {
            Swal.fire({ icon: 'success', title: 'Enviado para Torre', text: 'Veículo em fila de liberação.' });
        }
        
        e.target.reset();
        document.getElementById('reboques-container').style.display = 'none';
        carregarDadosBase();
    } catch (err) { 
        Swal.fire({ icon: 'error', title: 'Erro de Cadastro', text: err.message });
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="ph-fill ph-paper-plane-right"></i> Enviar para Vistoria';
    }
});

document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-func');
    const docAnexado = document.getElementById('func-doc').files[0];

    btn.disabled = true; btn.innerHTML = '<i class="ph-fill ph-spinner-gap ph-spin"></i> Processando...';

    try {
        await fazerUploadParaStorage(docAnexado, `func_${document.getElementById('func-cpf').value}`);

        const { error } = await supabaseClient.from('terceiros').insert([{ 
            empresa_id: parceiroLogado.id,
            nome: document.getElementById('func-nome').value,
            cpf_cnpj: document.getElementById('func-cpf').value,
            descricao_atividade: document.getElementById('func-cargo').value,
            status_homologacao: docAnexado ? 'Falta Integração' : 'Cadastro Incompleto',
            situacao: 'inativo' 
        }]);
        
        if (error) throw error;

        Swal.fire({ icon: 'success', title: 'Colaborador Cadastrado', text: 'Aguarde a liberação pela torre de controle.' });
        e.target.reset();
        carregarDadosBase();
    } catch (err) { 
        Swal.fire({ icon: 'error', title: 'Erro no Processo', text: err.message });
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="ph-fill ph-paper-plane-right"></i> Solicitar Integração';
    }
});

// ==========================================================
// RENDERIZAÇÃO DE DADOS (DASHBOARDS E LISTAS)
// ==========================================================
let dadosFrotaGlobais = [];
let dadosEquipeGlobais = [];

function isAtivo(item) {
    return item.situacao === 'ativo' && (item.status_homologacao.includes('Apto') || item.status_homologacao.includes('Integrado'));
}

async function carregarDadosBase() {
    document.getElementById('lista-frota-pendente').innerHTML = skeletonHTML();
    document.getElementById('lista-frota-ativa').innerHTML = skeletonHTML();
    document.getElementById('lista-equipe-pendente').innerHTML = skeletonHTML();
    document.getElementById('lista-equipe-ativa').innerHTML = skeletonHTML();

    try {
        const [camRes, eqRes, funcRes] = await Promise.all([
            supabaseClient.from('caminhoes').select('*').eq('proprietario_id', parceiroLogado.id),
            supabaseClient.from('equipamentos').select('*').eq('proprietario_id', parceiroLogado.id),
            supabaseClient.from('terceiros').select('*').eq('empresa_id', parceiroLogado.id)
        ]);

        let frota = [];
        if (camRes.data) frota = [...frota, ...camRes.data.map(c => ({...c, _tabela: 'caminhoes', _tipoDefault: 'Caminhão'}))];
        if (eqRes.data) frota = [...frota, ...eqRes.data.map(e => ({...e, _tabela: 'equipamentos', _tipoDefault: 'Máquina Agrícola'}))];
        
        dadosFrotaGlobais = frota.filter(item => item.situacao !== 'excluído pelo parceiro');
        dadosEquipeGlobais = (funcRes.data || []).filter(item => item.situacao !== 'excluído pelo parceiro');

        atualizarInterface();
    } catch(e) { console.error("Falha ao buscar dados", e); }
}

function atualizarInterface() {
    const frotaAtiva = dadosFrotaGlobais.filter(f => isAtivo(f));
    const frotaPendente = dadosFrotaGlobais.filter(f => !isAtivo(f));
    const equipeAtiva = dadosEquipeGlobais.filter(f => isAtivo(f));
    const equipePendente = dadosEquipeGlobais.filter(f => !isAtivo(f));

    document.getElementById('kpi-frota-ativa').textContent = frotaAtiva.length;
    document.getElementById('kpi-frota-pendente').textContent = frotaPendente.length;
    document.getElementById('kpi-equipe-total').textContent = equipeAtiva.length;

    renderListaFrota(frotaPendente, 'lista-frota-pendente', document.getElementById('busca-frota-pendente').value);
    renderListaFrota(frotaAtiva, 'lista-frota-ativa', document.getElementById('busca-frota-ativa').value);
    
    renderListaEquipe(equipePendente, 'lista-equipe-pendente');
    renderListaEquipe(equipeAtiva, 'lista-equipe-ativa');
}

document.getElementById('busca-frota-pendente').addEventListener('input', atualizarInterface);
document.getElementById('busca-frota-ativa').addEventListener('input', atualizarInterface);

function renderListaFrota(dados, containerId, filtro = '') {
    const container = document.getElementById(containerId);
    
    const dadosFiltrados = dados.filter(d => 
        (d.placa && d.placa.toLowerCase().includes(filtro.toLowerCase())) || 
        (d.descricao && d.descricao.toLowerCase().includes(filtro.toLowerCase()))
    );

    if (dadosFiltrados.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum veículo encontrado para operação.</div>`;
        return;
    }

    container.innerHTML = dadosFiltrados.map(item => {
        let cat = item._tipoDefault, desc = item.descricao || '-';
        const match = desc.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) { cat = match[1]; desc = match[2]; }

        const conf = item.configuracao || cat;
        const codUsina = (item.cod_equipamento && item.cod_equipamento !== item.placa) ? 
            `<span style="background: rgba(37,99,235,0.1); color: var(--primary-color); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">Cód Usina: ${item.cod_equipamento}</span>` : 
            `<span style="color: var(--warning); font-size: 0.75rem; font-style: italic;">Aguardando Cód. Torre</span>`;

        let reboques = '';
        if (item._tabela === 'caminhoes' && (conf === 'Rodotrem' || conf === 'Treminhão')) {
            const r1 = item.reboque1_placa ? `<strong>${item.reboque1_placa}</strong>` : `<span style="color:var(--danger);">Falta</span>`;
            const r2 = conf === 'Treminhão' ? (item.reboque2_placa ? ` | Reb 2: <strong>${item.reboque2_placa}</strong>` : ` | Reb 2: <span style="color:var(--danger);">Falta</span>`) : '';
            reboques = `<div style="margin-top: 8px; font-size: 0.8rem; background: #F8FAFC; padding: 6px 10px; border-radius: 6px; border: 1px dashed #CBD5E1;">Reb 1: ${r1} ${r2}</div>`;
        }

        const classStatus = getStatusClass(item.status_homologacao);
        const isBlocked = item.situacao === 'inativo' || item.status_homologacao === 'Bloqueado';
        const btnRenovar = isBlocked ? `<button class="btn-icon" title="Renovar e Desbloquear" style="color: var(--primary-color); border-color: var(--primary-color);" onclick="abrirModalRenovacao('${item._tabela}', '${item.id}')"><i class="ph ph-arrows-clockwise"></i></button>` : '';

        return `
        <div class="list-item ${classStatus}">
            <div class="item-main">
                <div class="item-icon"><i class="ph-fill ${getIconForType(conf)}"></i></div>
                <div class="item-details">
                    <span class="item-tag">${conf}</span>
                    <span class="item-title">${item.placa || 'S/ Placa'} ${codUsina}</span>
                    <span class="item-subtitle">${desc}</span>
                    ${reboques}
                </div>
            </div>
            <div class="item-status">${renderBadge(item.status_homologacao)}</div>
            <div class="item-actions">
                ${btnRenovar}
                <button class="btn-icon" title="Atualizar Dados" onclick="abrirModalEdicao('${item.id}', '${item._tabela}', '${item.placa}', '${desc}', '${conf}', '${item.reboque1_placa || ''}', '${item.reboque2_placa || ''}')"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-icon" title="Anexar Doc Pendente" onclick="abrirModalAnexo('${item.id}', '${item._tabela}', '${conf}')"><i class="ph ph-paperclip"></i></button>
                <button class="btn-icon danger" title="Remover da Operação" onclick="excluirItem('${item.id}', '${item._tabela}')"><i class="ph ph-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function renderListaEquipe(dados, containerId) {
    const container = document.getElementById(containerId);
    if (dados.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum colaborador nesta lista.</div>`;
        return;
    }

    container.innerHTML = dados.map(f => {
        const isBlocked = f.situacao === 'inativo' || f.status_homologacao === 'Bloqueado';
        const btnRenovar = isBlocked ? `<button class="btn-icon" title="Renovar e Desbloquear" style="color: var(--primary-color); border-color: var(--primary-color);" onclick="abrirModalRenovacao('terceiros', '${f.id}')"><i class="ph ph-arrows-clockwise"></i></button>` : '';

        return `
        <div class="list-item ${getStatusClass(f.status_homologacao)}">
            <div class="item-main">
                <div class="item-icon" style="color: #3B82F6;"><i class="ph-fill ph-user-gear"></i></div>
                <div class="item-details">
                    <span class="item-tag">${f.descricao_atividade || 'Colaborador'}</span>
                    <span class="item-title">${f.nome}</span>
                    <span class="item-subtitle">CPF: ${f.cpf_cnpj || 'Não informado'}</span>
                </div>
            </div>
            <div class="item-status">${renderBadge(f.status_homologacao)}</div>
            <div class="item-actions">
                ${btnRenovar}
                <button class="btn-icon" title="Editar" onclick="abrirModalEdicao('${f.id}', 'terceiros', '${f.nome}', '${f.descricao_atividade}', '', '', '')"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-icon danger" title="Desvincular" onclick="excluirItem('${f.id}', 'terceiros')"><i class="ph ph-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

// Helpers Visuais
function getStatusClass(v = '') {
    if (v.includes('Apto') || v.includes('Ativo') || v.includes('Integrado')) return 'status-apto';
    if (v.includes('Incompleto')) return 'status-incompleto';
    if (v.includes('Inativo') || v.includes('Falta') || v.includes('Bloqueado')) return 'status-inativo';
    return 'status-pendente';
}

function renderBadge(v = 'Pendente') {
    let bg = 'rgba(245, 158, 11, 0.1)', color = 'var(--warning)', border = '#FCD34D'; 
    if (v.includes('Apto') || v.includes('Ativo') || v.includes('Integrado')) {
        bg = 'rgba(16, 185, 129, 0.1)'; color = 'var(--success)'; border = '#6EE7B7';
    } else if (v.includes('Incompleto')) {
        bg = 'rgba(148, 163, 184, 0.1)'; color = '#64748B'; border = '#CBD5E1'; 
    } else if (v.includes('Inativo') || v.includes('Falta') || v.includes('Bloqueado')) {
        bg = 'rgba(239, 68, 68, 0.1)'; color = 'var(--danger)'; border = '#FCA5A5';
    }
    return `<span class="status-badge" style="background: ${bg}; color: ${color}; border: 1px solid ${border};">${v}</span>`;
}

function getIconForType(tipo) {
    if (['Rodotrem', 'Treminhão'].includes(tipo)) return 'ph-truck-trailer';
    if (['Colhedora', 'Carregadeira', 'Trator Reboque', 'Trator Transbordo'].includes(tipo)) return 'ph-tractor';
    return 'ph-truck'; 
}

// ==========================================================
// AÇÕES SECUNDÁRIAS (EDIÇÃO, EXCLUSÃO E ANEXOS)
// ==========================================================
window.excluirItem = function(id, tabela) {
    Swal.fire({
        title: 'Remover da Operação?',
        text: "Este item sairá da responsabilidade da Torre de Controle.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Sim, remover'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await supabaseClient.from(tabela).update({ situacao: 'excluído pelo parceiro' }).eq('id', id);
                carregarDadosBase();
                Swal.fire('Removido', 'Registro desvinculado com sucesso.', 'success');
            } catch (err) { Swal.fire('Erro', 'Falha ao remover item.', 'error'); }
        }
    });
}

window.abrirModalAnexo = function(id, tabela, configuracao) {
    document.getElementById('anexo-id-item').value = id;
    document.getElementById('anexo-tabela').value = tabela;

    const optReb1 = document.getElementById('opt-reb1');
    const optReb2 = document.getElementById('opt-reb2');
    
    if (configuracao === 'Rodotrem') { optReb1.style.display = 'block'; optReb2.style.display = 'none'; } 
    else if (configuracao === 'Treminhão') { optReb1.style.display = 'block'; optReb2.style.display = 'block'; } 
    else { optReb1.style.display = 'none'; optReb2.style.display = 'none'; }
    
    document.getElementById('modal-anexo').style.display = 'flex';
}

window.realizarUploadDocumento = async function() {
    const input = document.getElementById('arquivo-upload');
    const file = input.files[0];
    if (!file) {
        Swal.fire('Atenção', 'Selecione um arquivo primeiro.', 'info');
        return;
    }

    await fazerUploadParaStorage(file, `doc_extra_${Date.now()}`);

    Swal.fire('Sucesso', 'Documento enviado para análise da Usina.', 'success');
    input.value = '';
    document.getElementById('modal-anexo').style.display = 'none';
}

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
    } else { divReboques.style.display = 'none'; }
    
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
        
        Swal.fire('Salvo!', 'Dados logísticos atualizados com sucesso.', 'success');
        carregarDadosBase();
    } catch (err) { Swal.fire('Erro', 'Falha ao atualizar registro.', 'error'); }
});

// ==========================================================
// RENOVAÇÃO E DESBLOQUEIO DE SAFRA
// ==========================================================
window.abrirModalRenovacao = function(tipoTabela, idItem) {
    document.getElementById('renovacao-id').value = idItem;
    document.getElementById('renovacao-tipo').value = tipoTabela;
    document.getElementById('arquivo-renovacao').value = '';
    document.getElementById('modal-renovacao').style.display = 'flex';
}

document.getElementById('form-renovacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-submit-renovacao');
    const id = document.getElementById('renovacao-id').value;
    const tipo = document.getElementById('renovacao-tipo').value;
    const fileInput = document.getElementById('arquivo-renovacao');
    const file = fileInput.files[0];
    
    if (!file) return;

    btn.disabled = true; 
    btn.innerHTML = '<i class="ph-fill ph-spinner-gap ph-spin"></i> Processando...';
    
    try {
        // Envia o arquivo para o banco
        const urlDocumento = await fazerUploadParaStorage(file, `${tipo}_renovacao_${id}`);
        
        // Define para onde o item vai na sua tela de Triagem
        const novoStatusHomologacao = tipo === 'terceiros' ? 'Falta Integração' : 'Pendente Vistoria';
        
        const { error } = await supabaseClient.from(tipo).update({
            documento_url: urlDocumento,
            situacao: 'ativo', 
            status_homologacao: novoStatusHomologacao
        }).eq('id', id);

        if (error) throw error;

        Swal.fire('Enviado!', 'Documentação enviada. O item está em análise pela usina.', 'success');
        document.getElementById('modal-renovacao').style.display = 'none';
        carregarDadosBase();
    } catch (error) {
        console.error('Erro na renovação:', error);
        Swal.fire('Erro', 'Falha ao enviar documento.', 'error');
    } finally {
        btn.disabled = false; 
        btn.innerHTML = '<i class="ph-fill ph-paper-plane-right"></i> Enviar para Aprovação';
    }
});