document.addEventListener('DOMContentLoaded', () => {

    const PREDEFINED_SKILLS = [
        { id: 's01', name: 'Ataque Básico', type: 'damage', base: 'forca', power: 0.8, cost: 0, desc: 'Ataque simples com Força. Não gasta mana.' },
        { id: 's02', name: 'Golpe Poderoso', type: 'damage', base: 'forca', power: 1.5, cost: 10, desc: 'Ataque concentrado com Força, causando dano massivo.' },
        { id: 's03', name: 'Bola de Fogo', type: 'damage', base: 'int', power: 1.2, cost: 8, desc: 'Dano mágico de fogo baseado na Inteligência.' },
        { id: 's04', name: 'Cura Leve', type: 'heal', base: 'int', power: 1.2, cost: 10, desc: 'Recupera HP baseado na Inteligência.' },
        { id: 's05', name: 'Barreira Mágica', type: 'buff', stat: 'defesa', power: 8, cost: 15, duration: 3, desc: 'Aumenta a Defesa do alvo por 3 turnos.' },
        { id: 's06', name: 'Raio Gélido', type: 'debuff', base: 'int', power: 0.5, stat: 'vel', cost: 15, duration: 2, desc: 'Dano leve e reduz a Velocidade do alvo por 2 turnos.' },
        { id: 's07', name: 'Meditar', type: 'mana', power: 25, cost: 0, desc: 'Pula o turno para recuperar 25 de Mana.' },
        { id: 's08', name: 'Poção de Vida', type: 'item_heal', power: 30, cost: 0, limit: 1, desc: 'Usa um item para curar 30 de HP. Limite de 1 por batalha.' },
        { id: 's09', name: 'Golpe Vampírico', type: 'damage_heal', base: 'forca', power: 0.7, cost: 12, desc: 'Causa dano e cura 50% do dano causado.' },
    ];
    const MAX_SKILLS = 5;

    let heroes = [], enemies = [], selectedHeroIds = [], selectedEnemyIds = [], battleState = {};
    let editorState = { editingCharacter: null, mode: 'hero', imageSource: 'upload' };
    
    // --- Funções de Inicialização e Navegação ---
    function init() {
        carregarDados();
        setupEventListeners();
        mostrarTela('inicial');
    }

    function setupEventListeners() {
        document.getElementById('btn-iniciar-gerenciador').addEventListener('click', () => { renderizarRoster(); mostrarTela('selecao'); });
        document.getElementById('btn-voltar-menu-selecao').addEventListener('click', () => mostrarTela('inicial'));
        document.getElementById('btn-novo-heroi').addEventListener('click', () => abrirEditor(null, 'hero'));
        document.getElementById('btn-novo-inimigo').addEventListener('click', () => abrirEditor(null, 'enemy'));
        document.getElementById('btn-iniciar-batalha').addEventListener('click', iniciarBatalha);
        document.getElementById('btn-voltar-roster').addEventListener('click', () => mostrarTela('selecao'));
        // Editor
        document.getElementById('btn-salvar-personagem').addEventListener('click', salvarPersonagem);
        document.getElementById('btn-cancelar-edicao').addEventListener('click', () => mostrarTela('selecao'));
        document.getElementById('btn-distribuir-pontos').addEventListener('click', distribuirPontos);
        document.getElementById('nivel').addEventListener('input', atualizarPontos);
        document.querySelectorAll('.stat-input').forEach(input => input.addEventListener('input', atualizarPontos));
        document.getElementById('btn-trocar-foto').addEventListener('click', () => document.getElementById('foto-input').click());
        document.getElementById('foto-input').addEventListener('change', handleImageUpload);
        document.getElementById('foto-url').addEventListener('input', () => { document.getElementById('foto-preview').src = document.getElementById('foto-url').value || 'img/placeholder.png'; });
        document.getElementById('btn-toggle-upload').addEventListener('click', () => toggleImageSource('upload'));
        document.getElementById('btn-toggle-url').addEventListener('click', () => toggleImageSource('url'));
    }

    const mostrarTela = (nomeTela) => { Object.values(document.querySelectorAll('.tela-container')).forEach(t => t.classList.remove('active')); document.getElementById(`tela-${nomeTela}`).classList.add('active'); };
    const salvarDados = () => { localStorage.setItem('rpg_heroes_v4', JSON.stringify(heroes)); localStorage.setItem('rpg_enemies_v4', JSON.stringify(enemies)); };
    const carregarDados = () => { heroes = JSON.parse(localStorage.getItem('rpg_heroes_v4')) || []; enemies = JSON.parse(localStorage.getItem('rpg_enemies_v4')) || []; };

    // --- Lógica do Editor ---
    function toggleImageSource(source) {
        editorState.imageSource = source;
        document.getElementById('btn-toggle-upload').classList.toggle('active', source === 'upload');
        document.getElementById('btn-toggle-url').classList.toggle('active', source === 'url');
        document.getElementById('input-container-upload').classList.toggle('hidden', source !== 'upload');
        document.getElementById('input-container-url').classList.toggle('hidden', source !== 'url');
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { document.getElementById('foto-preview').src = ev.target.result; };
            reader.readAsDataURL(file);
        }
    }

    function abrirEditor(char = null, tipo) {
        editorState = { editingCharacter: char, mode: tipo, imageSource: 'upload' };
        document.querySelector('.editor-form').reset();
        document.getElementById('nivel').value = 1;
        document.getElementById('foto-preview').src = 'img/placeholder.png';
        const skillsContainer = document.getElementById('lista-habilidades-editor');
        skillsContainer.innerHTML = PREDEFINED_SKILLS.map(s => `<div><input type="checkbox" id="s_${s.id}" data-skill-id="${s.id}"><label for="s_${s.id}" title="${s.desc}">${s.name} (${s.cost}M)</label></div>`).join('');
        
        if (char) {
            document.getElementById('editor-titulo').textContent = `Editar ${tipo === 'hero' ? 'Herói' : 'Inimigo'}`;
            Object.keys(char).forEach(k => { if (document.getElementById(k)) document.getElementById(k).value = char[k]; });
            document.getElementById('foto-preview').src = char.fotoUrl || 'img/placeholder.png';
            if(char.fotoUrl && !char.fotoUrl.startsWith('data:image')) {
                toggleImageSource('url');
                document.getElementById('foto-url').value = char.fotoUrl;
            }
            if (char.skills) char.skills.forEach(s => { const cb = document.getElementById(`s_${s.id}`); if(cb) cb.checked = true; });
        } else {
            document.getElementById('editor-titulo').textContent = `Criar Novo ${tipo === 'hero' ? 'Herói' : 'Inimigo'}`;
        }
        atualizarPontos(); mostrarTela('editor');
    }

    function distribuirPontos() {
        let pontosRestantes = parseInt(document.getElementById('pontos-restantes').textContent);
        const statInputs = Array.from(document.querySelectorAll('.stat-input'));
        let i = 0;
        while (pontosRestantes > 0) {
            const input = statInputs[i % statInputs.length];
            input.value = parseInt(input.value || 0) + 1;
            pontosRestantes--;
            i++;
        }
        atualizarPontos();
    }
    
    function atualizarPontos() {
        const nivel = parseInt(document.getElementById('nivel').value) || 1;
        const statLimit = nivel * 10;
        let pontosUsados = 0;
        let isAnyStatInvalid = false;
        document.querySelectorAll('.stat-input').forEach(input => {
            const statValue = parseInt(input.value) || 0;
            pontosUsados += statValue;
            if (statValue > statLimit) {
                input.classList.add('stat-limit-exceeded');
                isAnyStatInvalid = true;
            } else {
                input.classList.remove('stat-limit-exceeded');
            }
        });
        const pontosTotais = nivel * 3;
        document.getElementById('pontos-totais').textContent = pontosTotais;
        document.getElementById('pontos-restantes').textContent = pontosTotais - pontosUsados;
        document.getElementById('btn-salvar-personagem').disabled = (pontosTotais - pontosUsados) < 0 || isAnyStatInvalid;
    }

    function salvarPersonagem() {
        if (parseInt(document.getElementById('pontos-restantes').textContent) < 0) { alert("Pontos insuficientes!"); return; }
        const selectedSkills = Array.from(document.getElementById('lista-habilidades-editor').querySelectorAll('input:checked'));
        if (selectedSkills.length > MAX_SKILLS) { alert(`Você pode selecionar no máximo ${MAX_SKILLS} habilidades.`); return; }

        const fotoUrl = editorState.imageSource === 'url' ? document.getElementById('foto-url').value : document.getElementById('foto-preview').src;
        const charData = {
            id: editorState.editingCharacter ? editorState.editingCharacter.id : Date.now(),
            nome: document.getElementById('nome').value.trim() || "Anônimo",
            nivel: parseInt(document.getElementById('nivel').value),
            fotoUrl,
            skills: selectedSkills.map(cb => PREDEFINED_SKILLS.find(s => s.id === cb.dataset.skillId)),
        };
        ['hp','mana','forca','defesa','int','vel'].forEach(s => charData[s] = parseInt(document.getElementById(s).value) || 0);
        charData.maxHp = charData.hp; charData.maxMana = charData.mana;
        const lista = editorState.mode === 'hero' ? heroes : enemies;
        if (editorState.editingCharacter) {
            lista[lista.findIndex(c => c.id === editorState.editingCharacter.id)] = charData;
        } else {
            lista.push(charData);
        }
        salvarDados(); renderizarRoster(); mostrarTela('selecao');
    }
    
    // --- Lógica da Seleção de Personagens (Roster) ---
    function renderizarRoster() {
        const criarCard = (char, tipo, lista) => {
            const isSelected = tipo === 'hero' ? selectedHeroIds.includes(char.id) : selectedEnemyIds.includes(char.id);
            const card = document.createElement('div');
            card.className = `personagem-card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `<img src="${char.fotoUrl || 'img/placeholder.png'}" alt="${char.nome}"><div class="personagem-info"><h4>${char.nome}</h4><p>Nível: ${char.nivel}</p></div><div class="personagem-acoes"><button title="Copiar">📄</button><button title="Editar">✏️</button><button title="Deletar">🗑️</button></div>`;
            card.addEventListener('click', () => selecionarParaBatalha(char.id, tipo));
            card.querySelector('[title="Copiar"]').addEventListener('click', (e) => { e.stopPropagation(); copiarPersonagem(char, tipo); });
            card.querySelector('[title="Editar"]').addEventListener('click', (e) => { e.stopPropagation(); abrirEditor(char, tipo); });
            card.querySelector('[title="Deletar"]').addEventListener('click', (e) => { e.stopPropagation(); deletarPersonagem(char.id, tipo); });
            lista.appendChild(card);
        };
        ['herois', 'inimigos'].forEach(t => { const l = document.getElementById(`lista-${t}`); l.innerHTML = ''; (t === 'herois' ? heroes : enemies).forEach(c => criarCard(c, t.slice(0, -2), l)); });
        document.getElementById('btn-iniciar-batalha').disabled = !(selectedHeroIds.length > 0 && selectedEnemyIds.length > 0);
    }

    function selecionarParaBatalha(id, tipo) {
        const arr = tipo === 'hero' ? selectedHeroIds : selectedEnemyIds;
        const index = arr.indexOf(id);
        if (index > -1) arr.splice(index, 1);
        else if (arr.length < 2) arr.push(id);
        renderizarRoster();
    }
    
    function copiarPersonagem(char, tipo) {
        const copia = JSON.parse(JSON.stringify(char));
        copia.id = Date.now();
        copia.nome = `${copia.nome} (Cópia)`;
        (tipo === 'hero' ? heroes : enemies).push(copia);
        salvarDados(); renderizarRoster();
    }

    function deletarPersonagem(id, tipo) {
        if (!confirm("Tem certeza?")) return;
        if (tipo === 'hero') { heroes = heroes.filter(c => c.id !== id); selectedHeroIds = selectedHeroIds.filter(i => i !== id); }
        else { enemies = enemies.filter(c => c.id !== id); selectedEnemyIds = selectedEnemyIds.filter(i => i !== id); }
        salvarDados(); renderizarRoster();
    }
    
    // --- Lógica de Batalha ---
    // ... (O restante da lógica da batalha, que é mais complexa, permanece aqui)

    init();
});