// ATENÇÃO: Substitua pelas MESMAS chaves do seu sistema interno!
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_KEY = 'SUA_ANON_KEY_AQUI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let parceiroLogado = null;

// Inicialização da Página
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se já está logado
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
        const { data, error } = await supabase.from('proprietarios').select('id, nome').order('nome');
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
        // Busca a empresa que tenha aquele ID e aquele Token
        const { data, error } = await supabase
            .from('proprietarios')
            .select('id, nome')
            .eq('id', empresaId)
            .eq('token_acesso', token)
            .single(); // Espera apenas 1 resultado exato

        if (error || !data) {
            throw new Error('Empresa ou token inválidos.');
        }

        // Sucesso no login
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

// 5. Cadastrar Equipamento (Usando ID Logado)
document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await supabase.from('terceiros_equipamentos').insert([{ 
            proprietario_id: parceiroLogado.id,
            placa: document.getElementById('eq-placa').value,
            modelo: document.getElementById('eq-modelo').value,
            ano: document.getElementById('eq-ano').value
        }]);
        alert('Enviado com sucesso!');
        e.target.reset();
        carregarMeusEquipamentos(); // Recarrega a tabela
    } catch (err) { alert('Erro ao cadastrar.'); }
});

// 6. Cadastrar Funcionário (Usando ID Logado)
document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await supabase.from('terceiros_funcionarios').insert([{ 
            proprietario_id: parceiroLogado.id,
            nome: document.getElementById('func-nome').value,
            cpf: document.getElementById('func-cpf').value,
            cargo: document.getElementById('func-cargo').value,
            equipamento_vinculado: document.getElementById('func-placa-vinculada').value
        }]);
        alert('Enviado com sucesso!');
        e.target.reset();
        carregarMeusFuncionarios(); // Recarrega a tabela
    } catch (err) { alert('Erro ao cadastrar.'); }
});

// 7. Buscar Listas do Banco de Dados
async function carregarMeusEquipamentos() {
    const tbody = document.getElementById('lista-meus-equipamentos');
    const { data } = await supabase.from('terceiros_equipamentos').select('*').eq('proprietario_id', parceiroLogado.id);
    if (data && data.length > 0) {
        tbody.innerHTML = data.map(eq => `<tr><td>${eq.placa}</td><td>${eq.modelo}</td><td><span class="status-badge">${eq.status}</span></td></tr>`).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum equipamento cadastrado ainda.</td></tr>';
    }
}

async function carregarMeusFuncionarios() {
    const tbody = document.getElementById('lista-meus-funcionarios');
    const { data } = await supabase.from('terceiros_funcionarios').select('*').eq('proprietario_id', parceiroLogado.id);
    if (data && data.length > 0) {
        tbody.innerHTML = data.map(f => `<tr><td>${f.nome}</td><td>${f.cargo}</td><td><span class="status-badge">${f.status}</span></td></tr>`).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum funcionário cadastrado ainda.</td></tr>';
    }
}