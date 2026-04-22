// ==================== MÓDULO: TROCA DE TURNO (CRUZAMENTO SEGURO) ====================

window.locaisTrocaCache = [];
window.mapaTroca = null;
window.markerTroca = null;

window.renderizarTrocaTurno = async function() {
    document.getElementById('dataFiltroTroca').value = new Date().toISOString().split('T')[0];
    await window.carregarLocaisTroca();
    await window.carregarTrocasDoDia();
};

window.iniciarMapaTroca = function() {
    if (window.mapaTroca) { window.mapaTroca.invalidateSize(); return; }
    window.mapaTroca = L.map('mapTroca').setView([-17.8876, -39.7342], 12);
    L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=pt-BR&x={x}&y={y}&z={z}', { maxZoom: 21 }).addTo(window.mapaTroca);
    window.mapaTroca.on('click', function(e) {
        if (window.markerTroca) window.mapaTroca.removeLayer(window.markerTroca);
        const { lat, lng } = e.latlng;
        window.markerTroca = L.marker([lat, lng]).addTo(window.mapaTroca).bindPopup("📍 Local selecionado!").openPopup();
        document.getElementById('latLocal').value = lat;
        document.getElementById('lngLocal').value = lng;
    });
};

window.alternarAbaTroca = function(aba) {
    if (aba === 'registros') {
        document.getElementById('aba-registros').style.display = 'block';
        document.getElementById('aba-locais').style.display = 'none';
        document.getElementById('btnAbaRegistros').className = 'btn-primary-blue';
        document.getElementById('btnAbaLocais').className = 'btn-secondary-dark';
        window.carregarTrocasDoDia();
    } else {
        document.getElementById('aba-registros').style.display = 'none';
        document.getElementById('aba-locais').style.display = 'block';
        document.getElementById('btnAbaRegistros').className = 'btn-secondary-dark';
        document.getElementById('btnAbaLocais').className = 'btn-primary-blue';
        setTimeout(() => window.iniciarMapaTroca(), 100);
        window.carregarLocaisTroca();
    }
};

window.carregarLocaisTroca = async function() {
    try {
        const { data, error } = await window.supabaseClient.from('locais_troca').select('*').order('nome');
        if (!error && data) {
            window.locaisTrocaCache = data;
            const tbody = document.getElementById('tbodyLocaisTroca');
            if (tbody) {
                tbody.innerHTML = data.map(l => `
                    <tr>
                        <td style="font-weight:bold;">${l.nome}</td>
                        <td style="text-align:center;"><a href="http://googleusercontent.com/maps.google.com/maps?q=${l.latitude},${l.longitude}" target="_blank" class="badge-go">🗺️ Maps</a></td>
                        <td style="text-align:center;"><button class="btn-danger" onclick="excluirLocalTroca('${l.id}')">🗑️</button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) { console.error("Sem locais", e); }
};

window.salvarNovoLocalTroca = async function() {
    const nome = document.getElementById('novoLocalTroca').value.trim();
    const lat = document.getElementById('latLocal').value;
    const lng = document.getElementById('lngLocal').value;
    if (!nome || !lat) return alert("⚠️ Dê um nome e marque no mapa antes de salvar!");
    try {
        await window.supabaseClient.from('locais_troca').insert([{ nome, latitude: parseFloat(lat), longitude: parseFloat(lng) }]);
        document.getElementById('novoLocalTroca').value = '';
        await window.carregarLocaisTroca();
    } catch (e) { alert("Erro ao salvar local."); }
};

window.excluirLocalTroca = async function(id) {
    if (!confirm("Excluir este local?")) return;
    await window.supabaseClient.from('locais_troca').delete().eq('id', id);
    await window.carregarLocaisTroca();
};

window.calcularProximaTroca = function(domId) {
    const inputHora = document.getElementById(`hora_${domId}`).value;
    const divProxima = document.getElementById(`prox_${domId}`);
    if(!inputHora) { divProxima.innerText = '--:--'; return; }
    let [h, m] = inputHora.split(':').map(Number);
    divProxima.innerText = `${((h + 12) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// ---------------- CRUZAMENTO COM TABELA DE CONJUNTOS E ESCALA ----------------

window.carregarTrocasDoDia = async function() {
    const dataRef = document.getElementById('dataFiltroTroca').value;
    const tbody = document.getElementById('tbodyTrocaTurno');
    if (!tbody || !dataRef) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px;">Processando escala e cruzando frotas...</td></tr>`;

    try {
        let registros = [];
        try {
            const res = await window.supabaseClient.from('registro_troca_turno').select('*').eq('data_referencia', dataRef);
            if (res.data) registros = res.data;
        } catch(e) { console.warn("Supabase indisponível para busca", e); }

        // A MÁGICA ESTÁ AQUI: Lê direto da variável de memória nativa do sistema
        const mLista = (typeof motoristas !== 'undefined') ? motoristas : (window.motoristas || []);
        const cLista = (typeof conjuntos !== 'undefined') ? conjuntos : (window.conjuntos || []);

        if (cLista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#f1c40f;">Nenhum Conjunto (Trinca) encontrado na memória do sistema.</td></tr>`;
            return;
        }

        let html = '';

        cLista.sort((a, b) => Number(a.id) - Number(b.id)).forEach(conj => {
            if (!conj.caminhoes || conj.caminhoes.length === 0) return;

            conj.caminhoes.forEach((cam, idxCam) => {
                const placa = typeof cam === 'string' ? cam : cam.placa;
                const go = typeof cam === 'string' ? '-' : (cam.go || '-');
                const placaNorm = String(placa).trim().toUpperCase();

                let motoristasHoje = [];
                mLista.forEach(m => {
                    if (typeof window.getEscalaDiaComputada === 'function') {
                        const esc = window.getEscalaDiaComputada(m, dataRef);
                        if (String(esc.caminhao).trim().toUpperCase() === placaNorm && esc.caminhao !== 'F') {
                            motoristasHoje.push({ nome: m.nome, turno: esc.turno || m.turno || 'Indefinido' });
                        }
                    }
                });

                if (motoristasHoje.length === 0) {
                    motoristasHoje.push({ nome: null, turno: 'Sem Escala' });
                }

                motoristasHoje.forEach((esc, idxTurno) => {
                    const domId = `${placaNorm.replace(/[^A-Z0-9]/g, '')}_${idxTurno}`;
                    const reg = registros.find(r => r.placa_cavalo.toUpperCase() === placaNorm && r.turno_previsto === esc.turno) || {};
                    const motoristaAtual = reg.motorista_programado || esc.nome || '';
                    const horarioReal = reg.horario_real || '';
                    
                    let proximaTroca = '--:--';
                    if(horarioReal) {
                        let [h, m] = horarioReal.split(':').map(Number);
                        proximaTroca = `${((h + 12) % 24).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    }

                    let selectMot = `<select id="mot_${domId}" class="input-moderno">`;
                    if (esc.nome) selectMot += `<option value="${esc.nome}" selected>✅ ${esc.nome} (Escala)</option>`;
                    else selectMot += `<option value="">-- Parado --</option>`;
                    
                    mLista.forEach(m => { 
                        if(m.nome !== esc.nome) selectMot += `<option value="${m.nome}" ${m.nome === motoristaAtual ? 'selected' : ''}>${m.nome}</option>`; 
                    });
                    selectMot += `</select>`;

                    let selectLocal = `<select id="local_${domId}" class="input-moderno"><option value="">Selecione...</option>`;
                    window.locaisTrocaCache.forEach(l => {
                        selectLocal += `<option value="${l.id}" ${reg.local_troca_id === l.id ? 'selected' : ''}>${l.nome}</option>`;
                    });
                    selectLocal += `</select>`;

                    let bgStyle = (idxTurno === 1) ? 'background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(59, 130, 246, 0.3);' : 'border-bottom: 1px solid rgba(255,255,255,0.05);';
                    let badgeClass = esc.turno !== 'Sem Escala' ? `<span class="badge-turno">${esc.turno}</span>` : `<span style="color:#ef4444; font-size:0.8rem; font-weight:bold;">PARADO</span>`;

                    html += `
                        <tr style="${bgStyle}">
                            <td style="font-weight: bold; color: var(--ccol-blue-bright);">
                                TRINCA ${String(conj.id).padStart(2,'0')} 
                                <br><span class="badge-go" style="margin-top:4px;">GO ${go}</span>
                            </td>
                            <td style="font-weight: bold; color: #fff; font-size:1.1rem;">🚛 ${placaNorm}</td>
                            <td style="text-align: center;">${badgeClass}</td>
                            <td>${selectMot}</td>
                            <td>${selectLocal}</td>
                            <td><input type="time" id="hora_${domId}" class="input-moderno" value="${horarioReal}" onchange="calcularProximaTroca('${domId}')"></td>
                            <td style="text-align: center;"><span id="prox_${domId}" class="hora-estimada">${proximaTroca}</span></td>
                            <td><button class="btn-primary-green" onclick="salvarTroca('${domId}', '${placaNorm}', '${esc.turno}')" style="width:100%; padding:8px;">💾 Salvar</button></td>
                        </tr>
                    `;
                });
            });
        });

        tbody.innerHTML = html;
    } catch (e) {
        console.error("Erro na varredura", e);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color:#ef4444;">Erro ao cruzar os dados. Veja o console.</td></tr>`;
    }
};

window.salvarTroca = async function(domId, placa, turnoPrevisto) {
    const dataRef = document.getElementById('dataFiltroTroca').value;
    const motorista = document.getElementById(`mot_${domId}`).value;
    const localId = document.getElementById(`local_${domId}`).value;
    const hora = document.getElementById(`hora_${domId}`).value;

    if (!localId || !hora) return alert("⚠️ Preencha o Local e Horário Real antes de salvar.");

    try {
        const { data: exist } = await window.supabaseClient.from('registro_troca_turno').select('id')
            .eq('data_referencia', dataRef).eq('placa_cavalo', placa).eq('turno_previsto', turnoPrevisto).single();

        const p = { data_referencia: dataRef, placa_cavalo: placa, turno_previsto: turnoPrevisto, motorista_programado: motorista, local_troca_id: localId, horario_real: hora };

        if (exist) await window.supabaseClient.from('registro_troca_turno').update(p).eq('id', exist.id);
        else await window.supabaseClient.from('registro_troca_turno').insert([p]);
        
        alert("✔️ Registro Salvo!");
        window.carregarTrocasDoDia();
    } catch (e) { alert("Erro de conexão ao salvar."); }
};