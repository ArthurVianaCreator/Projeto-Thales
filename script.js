document.addEventListener('DOMContentLoaded', () => {

    const PREDEFINED_SKILLS = [
        { id: 's01', name: 'Ataque Básico', type: 'damage', base: 'forca', power: 0.8, cost: 0, desc: 'Ataque simples com Força. Não gasta mana.' },
        { id: 's02', name: 'Golpe Poderoso', type: 'damage', base: 'forca', power: 1.5, cost: 10, desc: 'Ataque concentrado com Força, causando mais dano.' },
        { id: 's03', name: 'Bola de Fogo', type: 'damage', base: 'int', power: 1.2, cost: 8, desc: 'Lança uma bola de fogo que usa a Inteligência para causar dano.' },
        { id: 's04', name: 'Cura Leve', type: 'heal', base: 'int', power: 1.2, cost: 10, desc: 'Recupera uma pequena quantidade de HP, baseado na Inteligência.' },
        { id: 's05', name: 'Barreira Mágica', type: 'buff', stat: 'defesa', power: 8, cost: 15, duration: 3, desc: 'Aumenta a Defesa do alvo por 3 turnos.' },
        { id: 's06', name: 'Raio Gélido', type: 'debuff', base: 'int', power: 0.5, stat: 'vel', cost: 15, duration: 2, desc: 'Causa dano leve e reduz a Velocidade do alvo por 2 turnos.' },
        { id: 's07', name: 'Meditar', type: 'mana', power: 25, cost: 0, desc: 'Pula o turno para recuperar 25 de Mana.' },
        { id: 's08', name: 'Poção de Vida', type: 'item_heal', power: 30, cost: 0, limit: 1, desc: 'Usa um item para curar 30 de HP. Limite de 1 por batalha.' },
        { id: 's09', name: 'Golpe Vampírico', type: 'damage_heal', base: 'forca', power: 0.7, cost: 12, desc: 'Causa dano e cura 50% do dano causado.' },
    ];
    const MAX_SKILLS = 5;

    let heroes = [], enemies = [], selectedHeroIds = [], selectedEnemyIds = [], battleState = {};
    let editorState = { editingCharacter: null, mode: 'hero', imageSource: 'upload' };
    
    // --- Funções de Inicialização e Utilitários ---
    function init() { carregarDados(); setupEventListeners(); mostrarTela('inicial'); }
    const mostrarTela = (id) => { document.querySelectorAll('.tela-container').forEach(t => t.classList.remove('active')); document.getElementById(`tela-${id}`).classList.add('active'); };
    const salvarDados = () => { localStorage.setItem('rpg_heroes_v6', JSON.stringify(heroes)); localStorage.setItem('rpg_enemies_v6', JSON.stringify(enemies)); };
    const carregarDados = () => { heroes = JSON.parse(localStorage.getItem('rpg_heroes_v6')) || []; enemies = JSON.parse(localStorage.getItem('rpg_enemies_v6')) || []; };
    const getElem = (id) => document.getElementById(id);

    // --- Configuração de Eventos ---
    function setupEventListeners() {
        getElem('btn-iniciar-gerenciador').addEventListener('click', () => { renderizarRoster(); mostrarTela('selecao'); });
        getElem('btn-voltar-menu-selecao').addEventListener('click', () => mostrarTela('inicial'));
        getElem('btn-novo-heroi').addEventListener('click', () => abrirEditor(null, 'hero'));
        getElem('btn-novo-inimigo').addEventListener('click', () => abrirEditor(null, 'enemy'));
        getElem('btn-iniciar-batalha').addEventListener('click', iniciarBatalha);
        getElem('btn-voltar-roster').addEventListener('click', () => { getElem('btn-voltar-roster').classList.add('hidden'); mostrarTela('selecao'); });
        getElem('btn-exportar').addEventListener('click', exportarDados);
        getElem('import-input').addEventListener('change', importarDados);
        // Editor
        getElem('btn-salvar-personagem').addEventListener('click', salvarPersonagem);
        getElem('btn-cancelar-edicao').addEventListener('click', () => mostrarTela('selecao'));
        getElem('btn-distribuir-pontos').addEventListener('click', distribuirPontosAleatorios);
        getElem('btn-habilidades-aleatorias').addEventListener('click', selecionarHabilidadesAleatorias);
        getElem('nivel').addEventListener('input', atualizarPontos);
        document.querySelectorAll('.stat-input').forEach(input => input.addEventListener('input', atualizarPontos));
        getElem('btn-trocar-foto').addEventListener('click', () => getElem('foto-input').click());
        getElem('foto-input').addEventListener('change', handleImageUpload);
        getElem('foto-url').addEventListener('input', () => { getElem('foto-preview').src = getElem('foto-url').value || 'img/placeholder.png'; });
        getElem('btn-toggle-upload').addEventListener('click', () => toggleImageSource('upload'));
        getElem('btn-toggle-url').addEventListener('click', () => toggleImageSource('url'));
    }

    // --- Lógica do Editor ---
    function abrirEditor(char, tipo) {
        editorState = { editingCharacter: char, mode: tipo, imageSource: 'upload' };
        document.querySelector('.editor-form').reset();
        ['hp','mana','forca','defesa','int','vel'].forEach(s => getElem(s).value = 0);
        getElem('nivel').value = 1;
        getElem('foto-preview').src = 'img/placeholder.png';
        const skillsContainer = getElem('lista-habilidades-editor');
        skillsContainer.innerHTML = PREDEFINED_SKILLS.map(s => `<div><input type="checkbox" id="s_${s.id}" data-skill-id="${s.id}"><label for="s_${s.id}" title="${s.desc}">${s.name} (${s.cost}M)</label></div>`).join('');
        
        if (char) {
            getElem('editor-titulo').textContent = `Editar ${tipo === 'hero' ? 'Herói' : 'Inimigo'}`;
            Object.keys(char).forEach(k => { if (getElem(k)) getElem(k).value = char[k]; });
            getElem('foto-preview').src = char.fotoUrl || 'img/placeholder.png';
            if(char.fotoUrl && !char.fotoUrl.startsWith('data:image')) { toggleImageSource('url'); getElem('foto-url').value = char.fotoUrl; }
            if (char.skills) char.skills.forEach(s => { const cb = getElem(`s_${s.id}`); if(cb) cb.checked = true; });
        } else {
            getElem('editor-titulo').textContent = `Criar Novo ${tipo === 'hero' ? 'Herói' : 'Inimigo'}`;
        }
        atualizarPontos(); mostrarTela('editor');
    }

    function distribuirPontosAleatorios() {
        let pontos = parseInt(getElem('pontos-restantes').textContent);
        const inputs = Array.from(document.querySelectorAll('.stat-input'));
        while(pontos > 0) {
            const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
            randomInput.value = parseInt(randomInput.value || 0) + 1;
            pontos--;
        }
        atualizarPontos();
    }

    function selecionarHabilidadesAleatorias() {
        const checkboxes = Array.from(document.querySelectorAll('#lista-habilidades-editor input[type="checkbox"]'));
        checkboxes.forEach(cb => cb.checked = false);
        const shuffled = checkboxes.sort(() => 0.5 - Math.random());
        shuffled.slice(0, MAX_SKILLS).forEach(cb => cb.checked = true);
    }
    
    function atualizarPontos() {
        const nivel = parseInt(getElem('nivel').value) || 1, statLimit = nivel * 10;
        let pontosUsados = 0, isInvalid = false;
        document.querySelectorAll('.stat-input').forEach(input => {
            const val = parseInt(input.value) || 0;
            pontosUsados += val;
            if (val > statLimit) { input.classList.add('stat-limit-exceeded'); isInvalid = true; } 
            else { input.classList.remove('stat-limit-exceeded'); }
        });
        getElem('pontos-totais').textContent = nivel * 3;
        getElem('pontos-restantes').textContent = (nivel * 3) - pontosUsados;
        getElem('btn-salvar-personagem').disabled = (nivel * 3 - pontosUsados) < 0 || isInvalid;
    }

    function salvarPersonagem() {
        if (parseInt(getElem('pontos-restantes').textContent) < 0) return alert("Pontos insuficientes!");
        const selectedSkills = Array.from(getElem('lista-habilidades-editor').querySelectorAll('input:checked'));
        if (selectedSkills.length > MAX_SKILLS) return alert(`Selecione no máximo ${MAX_SKILLS} habilidades.`);
        const charData = { id: editorState.editingCharacter ? editorState.editingCharacter.id : Date.now(), nome: getElem('nome').value.trim() || "Anônimo", nivel: parseInt(getElem('nivel').value), fotoUrl: editorState.imageSource === 'url' ? getElem('foto-url').value : getElem('foto-preview').src, skills: selectedSkills.map(cb => PREDEFINED_SKILLS.find(s => s.id === cb.dataset.skillId)) };
        ['hp','mana','forca','defesa','int','vel'].forEach(s => charData[s] = parseInt(getElem(s).value) || 0);
        charData.maxHp = charData.hp; charData.maxMana = charData.mana;
        const lista = editorState.mode === 'hero' ? heroes : enemies;
        if (editorState.editingCharacter) lista[lista.findIndex(c => c.id === editorState.editingCharacter.id)] = charData;
        else lista.push(charData);
        salvarDados(); renderizarRoster(); mostrarTela('selecao');
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) { const reader = new FileReader(); reader.onload = (e) => getElem('foto-preview').src = e.target.result; reader.readAsDataURL(file); }
    }

    function toggleImageSource(source) {
        editorState.imageSource = source;
        getElem('btn-toggle-upload').classList.toggle('active', source === 'upload');
        getElem('btn-toggle-url').classList.toggle('active', source === 'url');
        getElem('input-container-upload').classList.toggle('hidden', source !== 'upload');
        getElem('input-container-url').classList.toggle('hidden', source !== 'url');
    }

    // --- Lógica de Roster, Import e Export ---
    function renderizarRoster() {
        const criarCard = (char, tipo, lista) => {
            const isSelected = tipo === 'hero' ? selectedHeroIds.includes(char.id) : selectedEnemyIds.includes(char.id);
            const card = document.createElement('div');
            card.className = `personagem-card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `<img src="${char.fotoUrl || 'img/placeholder.png'}"><div class="personagem-info"><h4>${char.nome}</h4><p>Nível: ${char.nivel}</p></div><div class="personagem-acoes"><button title="Copiar">📄</button><button title="Editar">✏️</button><button title="Deletar">🗑️</button></div>`;
            card.addEventListener('click', () => selecionarParaBatalha(char.id, tipo));
            card.querySelector('[title="Copiar"]').addEventListener('click', (e) => { e.stopPropagation(); copiarPersonagem(char, tipo); });
            card.querySelector('[title="Editar"]').addEventListener('click', (e) => { e.stopPropagation(); abrirEditor(char, tipo); });
            card.querySelector('[title="Deletar"]').addEventListener('click', (e) => { e.stopPropagation(); deletarPersonagem(char.id, tipo); });
            lista.appendChild(card);
        };
        ['herois', 'inimigos'].forEach(t => { const l = getElem(`lista-${t}`); l.innerHTML = ''; (t === 'herois' ? heroes : enemies).forEach(c => criarCard(c, t.slice(0, -2), l)); });
        getElem('btn-iniciar-batalha').disabled = !(selectedHeroIds.length > 0 && selectedEnemyIds.length > 0);
    }
    
    function selecionarParaBatalha(id, tipo) {
        const arr = tipo === 'hero' ? selectedHeroIds : selectedEnemyIds;
        const index = arr.indexOf(id);
        if (index > -1) arr.splice(index, 1);
        else if (arr.length < 2) arr.push(id);
        renderizarRoster();
    }
    
    function copiarPersonagem(char, tipo) { const copia = JSON.parse(JSON.stringify(char)); copia.id = Date.now(); copia.nome = `${copia.nome} (Cópia)`; (tipo === 'hero' ? heroes : enemies).push(copia); salvarDados(); renderizarRoster(); }
    function deletarPersonagem(id, tipo) { if (!confirm("Tem certeza?")) return; const idArr = tipo === 'hero' ? selectedHeroIds : selectedEnemyIds; if (tipo === 'hero') heroes = heroes.filter(c => c.id !== id); else enemies = enemies.filter(c => c.id !== id); const index = idArr.indexOf(id); if (index > -1) idArr.splice(index, 1); salvarDados(); renderizarRoster(); }
    
    function exportarDados() {
        const data = { heroes, enemies };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'agilizador_rpg_dados.json'; a.click();
        URL.revokeObjectURL(url);
    }

    function importarDados(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.heroes && data.enemies) {
                    const heroMap = new Map(heroes.map(h => [h.id, h]));
                    data.heroes.forEach(h => heroMap.set(h.id, h));
                    heroes = Array.from(heroMap.values());
                    const enemyMap = new Map(enemies.map(e => [e.id, e]));
                    data.enemies.forEach(e => enemyMap.set(e.id, e));
                    enemies = Array.from(enemyMap.values());
                    salvarDados(); renderizarRoster(); alert("Dados importados com sucesso!");
                } else { throw new Error("Formato de arquivo inválido."); }
            } catch (error) { alert("Erro ao importar arquivo: " + error.message); }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }
    
    // --- Lógica de Batalha ---
    // (O restante da lógica da batalha, que é mais complexa, permanece aqui)

    init();

    // --- LÓGICA DE BATALHA DETALHADA ---
    function iniciarBatalha() {
        const createCombatant = (char, party) => ({ ...JSON.parse(JSON.stringify(char)), party, buffs: [], itemUses: {} });
        battleState = { playerParty: heroes.filter(h => selectedHeroIds.includes(h.id)).map(c => createCombatant(c, 'player')), enemyParty: enemies.filter(e => selectedEnemyIds.includes(e.id)).map(c => createCombatant(c, 'enemy')), turnIndex: -1, currentTargetId: null, log: getElem('log-combate') };
        battleState.turnOrder = [...battleState.playerParty, ...battleState.enemyParty].sort((a, b) => b.vel - a.vel);
        battleState.log.innerHTML = '';
        adicionarLog('A batalha começou!'); mostrarTela('batalha');
        avancarTurno();
    }

    function avancarTurno() {
        if (checarFimDeJogo()) return;
        battleState.turnIndex = (battleState.turnIndex + 1) % battleState.turnOrder.length;
        let combatenteAtual = battleState.turnOrder[battleState.turnIndex];
        while (combatenteAtual.hp <= 0) {
            battleState.turnIndex = (battleState.turnIndex + 1) % battleState.turnOrder.length;
            combatenteAtual = battleState.turnOrder[battleState.turnIndex];
        }
        battleState.currentTargetId = null;
        adicionarLog(`É o turno de ${combatenteAtual.nome}.`);
        renderizarUIBatalha();
        if (combatenteAtual.party === 'enemy') setTimeout(executarTurnoIA, 1500);
    }
    
    function renderizarUIBatalha() {
        const criarPainel = (char) => {
            const combatenteAtual = battleState.turnOrder[battleState.turnIndex];
            const p = document.createElement('div');
            p.className = 'painel-personagem-batalha';
            p.dataset.id = char.id;
            if(char.hp <= 0) p.classList.add('derrotado');
            if(char.id === combatenteAtual.id) p.classList.add('turno-ativo');
            if(char.id === battleState.currentTargetId) p.classList.add('alvo-selecionado');
            if(char.party !== combatenteAtual.party && char.hp > 0 && combatenteAtual.party === 'player') { p.classList.add('pode-ser-alvo'); p.addEventListener('click', () => { battleState.currentTargetId = char.id; renderizarUIBatalha(); }); }
            const hpP = char.maxHp > 0 ? (char.hp/char.maxHp)*100 : 0; const mnP = char.maxMana > 0 ? (char.mana/char.maxMana)*100 : 0;
            p.innerHTML = `<img src="${char.fotoUrl||'img/placeholder.png'}"><h3>${char.nome}</h3><div class="barra-vida"><div class="barra-vida-fill" style="width:${hpP}%"></div><div class="barra-texto">${char.hp}/${char.maxHp} HP</div></div><div class="barra-mana"><div class="barra-mana-fill" style="width:${mnP}%"></div><div class="barra-texto">${char.mana}/${char.maxMana} Mana</div></div>`;
            return p;
        };
        ['player', 'enemy'].forEach(party => { const lado = getElem(`lado-${party === 'player' ? 'jogador' : 'oponente'}`); lado.innerHTML = ''; battleState[`${party}Party`].forEach(p => lado.appendChild(criarPainel(p))); });
        renderizarPainelAcoes();
    }
    
    function renderizarPainelAcoes() {
        const combatenteAtual = battleState.turnOrder[battleState.turnIndex];
        const painel = getElem('painel-acoes');
        if (combatenteAtual.party !== 'player' || combatenteAtual.hp <= 0) { painel.innerHTML = '<p>Aguardando ação do oponente...</p>'; return; }
        
        const guidanceText = battleState.currentTargetId ? `Alvo: ${[...battleState.playerParty, ...battleState.enemyParty].find(c=>c.id === battleState.currentTargetId).nome}. Escolha uma ação.` : "Selecione um alvo para atacar ou curar.";
        painel.innerHTML = `<div id="player-guidance">${guidanceText}</div><div id="lista-acoes-batalha"></div><div class="habilidade-descricao" id="skill-desc">Passe o mouse sobre uma habilidade para ver a descrição.</div>`;
        const lista = getElem('lista-acoes-batalha');
        
        combatenteAtual.skills.forEach(s => {
            const btn = document.createElement('button');
            const itemUses = combatenteAtual.itemUses[s.id] || 0;
            const isItem = s.type.startsWith('item');
            const canTargetSelf = ['mana', 'item_heal'].includes(s.type);
            const limitReached = isItem && itemUses >= s.limit;
            btn.innerHTML = `${s.name} <span class="custo-mana">${isItem ? `${s.limit-itemUses}/${s.limit}` : `${s.cost}M`}</span>`;
            btn.disabled = (!canTargetSelf && battleState.currentTargetId === null) || combatenteAtual.mana < s.cost || limitReached;
            btn.addEventListener('click', () => executarAcao(s.id));
            btn.addEventListener('mouseover', () => getElem('skill-desc').textContent = s.desc);
            lista.appendChild(btn);
        });
    }

    function executarAcao(skillId) {
        const caster = battleState.turnOrder[battleState.turnIndex];
        const skill = PREDEFINED_SKILLS.find(s => s.id === skillId);
        const target = ['heal', 'buff', 'mana', 'item_heal'].includes(skill.type) ? caster : [...battleState.playerParty, ...battleState.enemyParty].find(c => c.id === battleState.currentTargetId);
        if (!target || !skill || caster.mana < skill.cost) return;
        if(skill.type.startsWith('item')) caster.itemUses[skill.id] = (caster.itemUses[skill.id] || 0) + 1;
        caster.mana -= skill.cost;
        let baseStat = caster[skill.base] || 0, dmg=0, cura=0;

        switch(skill.type) {
            case 'damage': dmg = Math.max(0, Math.floor(baseStat*skill.power) - target.defesa); target.hp = Math.max(0, target.hp - dmg); adicionarLog(`${caster.nome} usa ${skill.name} em ${target.nome}, causando ${dmg} de dano.`); break;
            case 'heal': case 'item_heal': cura = skill.base === 'static' ? skill.power : Math.floor(baseStat*skill.power); target.hp = Math.min(target.maxHp, target.hp + cura); adicionarLog(`${caster.nome} usa ${skill.name} em ${target.nome}, curando ${cura} de vida.`); break;
            case 'damage_heal': dmg = Math.max(0, Math.floor(baseStat * skill.power) - target.defesa); target.hp = Math.max(0, target.hp - dmg); cura = Math.floor(dmg * 0.5); caster.hp = Math.min(caster.maxHp, caster.hp + cura); adicionarLog(`${caster.nome} usa ${skill.name} em ${target.nome}, causando ${dmg} de dano e curando ${cura} de vida.`); break;
            case 'mana': caster.mana = Math.min(caster.maxMana, caster.mana + skill.power); adicionarLog(`${caster.nome} usa ${skill.name} e recupera ${skill.power} de mana.`); break;
        }
        avancarTurno();
    }

    function executarTurnoIA() {
        const ia = battleState.turnOrder[battleState.turnIndex];
        const alvos = battleState.playerParty.filter(p => p.hp > 0);
        if(!alvos.length) { return avancarTurno(); }
        
        // IA Lógica: Curar se vida < 40%
        const healSkill = ia.skills.find(s => s.type === 'heal' && ia.mana >= s.cost);
        if(healSkill && (ia.hp / ia.maxHp) < 0.4) {
            battleState.currentTargetId = ia.id; // Alvo é ele mesmo
            return executarAcao(healSkill.id);
        }

        // IA Lógica: Atacar o alvo com menos HP
        alvos.sort((a,b) => a.hp - b.hp);
        const alvo = alvos[0];
        const damageSkills = ia.skills.filter(s => s.type.includes('damage') && s.cost <= ia.mana).sort((a,b) => b.power - a.power);
        if(!damageSkills.length) { return avancarTurno(); } // Passa o turno se não pode fazer nada
        battleState.currentTargetId = alvo.id;
        executarAcao(damageSkills[0].id);
    }
    
    function checarFimDeJogo() {
        const playersVivos = battleState.playerParty.some(p => p.hp > 0);
        const enemiesVivos = battleState.enemyParty.some(p => p.hp > 0);
        if (!playersVivos || !enemiesVivos) {
            adicionarLog(playersVivos ? "Vitória! Todos os inimigos foram derrotados." : "Derrota! Todos os heróis caíram.");
            getElem('btn-voltar-roster').classList.remove('hidden');
            return true;
        }
        return false;
    }
    function adicionarLog(msg) { const li = document.createElement('li'); li.textContent = msg; battleState.log.prepend(li); }
    init();
});