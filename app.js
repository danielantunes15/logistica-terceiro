// ATENÇÃO: Substitua pelas MESMAS chaves do seu sistema interno!
const SUPABASE_URL = 'https://uogorpanshybcuhdekhg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZ29ycGFuc2h5YmN1aGRla2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTcxNzYsImV4cCI6MjA3NTE5MzE3Nn0.LSGlAeeLZsPnEw3GtEXzY4D9f3UZhk7SXyBgrGYaKMg';

// MUDANÇA AQUI: Trocamos "supabase" por "supabaseClient"
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let parceiroLogado = null;

// Inicialização da Página
document.addEventListener('DOMContentLoaded', async () => {
    const sessionStr = localStorage.getItem('bel_parceiro_session');
    if (sessionStr) {
        parceiroLogado = JSON.parse(sessionStr);
        mostrarPortal();
    } else {
        await carregarEmpresasNoLogin();
    }
});

// 1. Carregar Empresas no Dropdown do Login
async function carregarEmpresasNoLogin() {
    const select = document.getElementById('login-empresa');
    try {
        const { data, error } = await supabaseClient.from('proprietarios').select('id, nome').order('nome');
        if (error) throw error;
        
        select.innerHTML = '<option value="">Selecione sua empresa...</option>' + 
            data.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="">Erro ao carregar empresas</option>';
    }
}

// 2. Fazer Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const empresaId = document.getElementById('login-empresa').value;
    const token = document.getElementById('login-token').value;

    btn.innerHTML = 'Validando...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('proprietarios')
            .select('id, nome')
            .eq('id', empresaId)
            .eq('token_acesso', token)
            .single();

        if (error || !data) throw new Error('Empresa ou token inválidos.');

        parceiroLogado = data;
        localStorage.setItem('bel_parceiro_session', JSON.stringify(data));
        mostrarPortal();

    } catch (err) {
        alert('Falha no acesso: Verifique se selecionou a empresa correta e digitou o token exato.');
    } finally {
        btn.innerHTML = 'Entrar no Sistema';
        btn.disabled = false;
    }
});

// 3. Sair (Logout)
document.getElementById('btn-sair').addEventListener('click', () => {
    localStorage.removeItem('bel_parceiro_session');
    parceiroLogado = null;
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('login-token').value = '';
});

// 4. Mostrar Portal e Carregar Dados
function mostrarPortal() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('nome-empresa-logada').textContent = parceiroLogado.nome;
    
    carregarMeusEquipamentos();
    carregarMeusFuncionarios();
}

// Lógica das Abas
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(e.target.getAttribute('data-tab')).classList.add('active');
    });
});

// 5. Cadastrar Equipamento
document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await supabaseClient.from('terceiros_equipamentos').insert([{ 
            proprietario_id: parceiroLogado.id,
            placa: document.getElementById('eq-placa').value,
            modelo: document.getElementById('eq-modelo').value,
            ano: document.getElementById('eq-ano').value
        }]);
        alert('Enviado com sucesso!');
        e.target.reset();
        carregarMeusEquipamentos();
    } catch (err) { alert('Erro ao cadastrar.'); }
});

// 6. Cadastrar Funcionário
document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await supabaseClient.from('terceiros_funcionarios').insert([{ 
            proprietario_id: parceiroLogado.id,
            nome: document.getElementById('func-nome').value,
            cpf: document.getElementById('func-cpf').value,
            cargo: document.getElementById('func-cargo').value,
            equipamento_vinculado: document.getElementById('func-placa-vinculada').value
        }]);
        alert('Enviado com sucesso!');
        e.target.reset();
        carregarMeusFuncionarios();
    } catch (err) { alert('Erro ao cadastrar.'); }
});

// 7. Buscar Listas do Banco de Dados
async function carregarMeusEquipamentos() {
    const tbody = document.getElementById('lista-meus-equipamentos');
    const { data } = await supabaseClient.from('terceiros_equipamentos').select('*').eq('proprietario_id', parceiroLogado.id);
    if (data && data.length > 0) {
        tbody.innerHTML = data.map(eq => `<tr><td>${eq.placa}</td><td>${eq.modelo}</td><td><span class="status-badge">${eq.status}</span></td></tr>`).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum equipamento cadastrado ainda.</td></tr>';
    }
}

async function carregarMeusFuncionarios() {
    const tbody = document.getElementById('lista-meus-funcionarios');
    const { data } = await supabaseClient.from('terceiros_funcionarios').select('*').eq('proprietario_id', parceiroLogado.id);
    if (data && data.length > 0) {
        tbody.innerHTML = data.map(f => `<tr><td>${f.nome}</td><td>${f.cargo}</td><td><span class="status-badge">${f.status}</span></td></tr>`).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum funcionário cadastrado ainda.</td></tr>';
    }
}