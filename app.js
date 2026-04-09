import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==========================================
// 👑 PROTEÇÃO DO FUNDADOR DO SISTEMA 👑
// Coloque o seu e-mail do Google exatamente como você loga.
// Ninguém poderá remover o seu acesso de Admin!
// ==========================================
const EMAIL_DO_DONO = "willyam.rodrigo6@gmail.com";"willyamrodrigo6@gmail.com" // <-- ALTERE PARA O SEU E-MAIL REAL AQUI!

const firebaseConfig = {
  apiKey: "AIzaSyCRLrik-rHVfDNz_gn2P4oYgraM64iHI0k",
  authDomain: "parametros-de-qualidade.firebaseapp.com",
  projectId: "parametros-de-qualidade",
  storageBucket: "parametros-de-qualidade.firebasestorage.app",
  messagingSenderId: "329194124166",
  appId: "1:329194124166:web:50d3685ef680284c5fb207"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let isAdmin = false; 
let registrosAtuais = {}; 

// ==========================================
// FUNÇÕES DE INTERFACE
// ==========================================
function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add('ativa');
}

function escrever(id, texto) {
    const el = document.getElementById(id);
    if (el) el.innerText = texto;
}

const getVal = (id) => {
    const el = document.getElementById(id);
    return (el && el.value !== "") ? parseFloat(el.value) : null;
};

const setEditVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== null && val !== undefined) ? val : "";
};

// ==========================================
// FUNÇÃO HISTÓRICO
// ==========================================
async function carregarHistorico() {
    const lista = document.getElementById("listaHistorico");
    if (!lista) return;
    lista.innerHTML = '<p style="text-align: center; color: #666;">Buscando as últimas 20 coletas...</p>';
    
    try {
        const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"), limit(20));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            lista.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma coleta registrada ainda.</p>';
            return;
        }

        let html = "";
        registrosAtuais = {}; 
        
        snap.forEach(doc => {
            const d = doc.data();
            const idDoc = doc.id;
            registrosAtuais[idDoc] = d; 
            
            const dataHora = d.timestamp ? d.timestamp.toDate().toLocaleString('pt-BR').substring(0, 16) : "Sem data";
            
            let botoesAdmin = "";
            if (isAdmin) {
                botoesAdmin = `
                    <button class="btn-editar" data-id="${idDoc}">✏️</button>
                    <button class="btn-excluir-novo" data-id="${idDoc}">Excluir</button>
                `;
            }

            html += `
            <div class="card-historico" id="card-${idDoc}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${d.tratamento} - ${d.caixa}</span>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: #007bff; margin-right: 5px;">${dataHora}</span>
                        ${botoesAdmin}
                    </div>
                </div>
                <p style="margin: 3px 0;"><strong>Turno:</strong> ${d.turno}</p>
                <p style="margin: 3px 0;"><strong>Coletor:</strong> ${d.coletor}</p>
                
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #eee;">
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Amônia:</strong><br>${d.amonia || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Nitrito:</strong><br>${d.nitrito || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>pH:</strong><br>${d.ph || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Temp:</strong><br>${d.temperatura || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>OD:</strong><br>${d.od || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Alcalinidade:</strong><br>${d.alcalinidade || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Dureza:</strong><br>${d.dureza || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Condutiv.:</strong><br>${d.condutividade || '-'}</span>
                    <span style="flex: 1 1 30%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Salinidade:</strong><br>${d.salinidade || '-'}</span>
                    <span style="flex: 1 1 100%; text-align: center; font-size: 0.8rem; color: #444;"><strong>Sólidos Totais:</strong><br>${d.solidos || '-'}</span>
                </div>
            </div>
            `;
        });
        lista.innerHTML = html;
    } catch (e) {
        console.error("Erro no histórico:", e);
        lista.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar o histórico.</p>';
    }
}

// ==========================================
// FUNÇÃO PAINEL ADMIN (COM PROTEÇÃO DO DONO)
// ==========================================
async function carregarListaUsuarios() {
    const listaUsuarios = document.getElementById("listaUsuariosAdmin");
    if (!listaUsuarios || !isAdmin) return;
    
    listaUsuarios.innerHTML = '<p style="text-align: center; color: #666;">Buscando equipe...</p>';

    try {
        const snap = await getDocs(collection(db, "usuarios"));
        let html = "";
        
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const uId = docSnap.id;
            
            const isEuMesmo = (uId === auth.currentUser.uid);
            const isDonoDoApp = (u.email === EMAIL_DO_DONO); // Checa se é o email sagrado
            
            let btnAcao = "";
            
            if (isDonoDoApp) {
                // Se for a conta do dono, ganha um selo especial e não tem botão de remover
                btnAcao = `<span style="font-size: 0.85rem; color: #ffc107; background: #333; padding: 4px 8px; border-radius: 4px; font-weight: bold;">👑 Fundador</span>`;
            } else if (isEuMesmo) {
                btnAcao = `<span style="font-size: 0.8rem; color: #28a745; font-weight: bold;">(Você)</span>`;
            } else if (u.admin) {
                btnAcao = `<button class="btn-toggle-admin" data-uid="${uId}" data-status="remover" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Remover Admin</button>`;
            } else {
                btnAcao = `<button class="btn-toggle-admin" data-uid="${uId}" data-status="dar" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Tornar Admin</button>`;
            }

            html += `
            <div class="card-usuario">
                <div>
                    <strong>${u.nome}</strong><br>
                    <span style="font-size: 0.75rem; color: #666;">${u.email}</span>
                </div>
                <div>${btnAcao}</div>
            </div>
            `;
        });
        listaUsuarios.innerHTML = html;
    } catch (err) {
        console.error(err);
        listaUsuarios.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar usuários.</p>';
    }
}

// ==========================================
// MONITOR DE AUTENTICAÇÃO
// ==========================================
let timeoutFirebase = setTimeout(() => { mostrarTela("telaLogin"); }, 5000);

onAuthStateChanged(auth, async (user) => {
    clearTimeout(timeoutFirebase);

    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const d = docSnap.data();
                isAdmin = d.admin === true;

                escrever("userNameHeader", d.nome);
                escrever("userEmailHeader", user.email);
                escrever("userEmailText", user.email);
                escrever("userIdText", user.uid);
                
                if (document.getElementById("editNome")) document.getElementById("editNome").value = d.nome;
                
                const inicial = d.nome ? d.nome.charAt(0).toUpperCase() : "?";
                escrever("userIniciaisSmall", inicial);
                escrever("userIniciaisLarge", inicial);

                if (isAdmin) {
                    const btnPlanilha = document.getElementById("btnBaixarRelatorio");
                    if (btnPlanilha) btnPlanilha.style.display = "block";
                    const badge = document.getElementById("badgeAdmin");
                    if (badge) badge.style.display = "block";
                    const tabAdmin = document.getElementById("tabAdmin");
                    if (tabAdmin) tabAdmin.style.display = "block";
                } else {
                    const btnPlanilha = document.getElementById("btnBaixarRelatorio");
                    if (btnPlanilha) btnPlanilha.style.display = "none";
                    const tabAdmin = document.getElementById("tabAdmin");
                    if (tabAdmin) tabAdmin.style.display = "none";
                }

                const btnLogin = document.getElementById('loginGoogleBtn');
                if (btnLogin) btnLogin.innerText = "Entrar com Google";

                mostrarTela("telaApp");
            } else {
                mostrarTela("telaCadastro");
            }
        } catch (e) {
            const btnLogin = document.getElementById('loginGoogleBtn');
            if (btnLogin) btnLogin.innerText = "Entrar com Google";
            mostrarTela("telaLogin");
        }
    } else {
        const btnLogin = document.getElementById('loginGoogleBtn');
        if (btnLogin) btnLogin.innerText = "Entrar com Google";
        mostrarTela("telaLogin");
    }
});

// ==========================================
// RADAR DE DUPLICIDADE (BLOQUEIA O BOTAO)
// ==========================================
async function verificarDuplicidade() {
    const turnoEl = document.getElementById("turno");
    const tratamentoEl = document.getElementById("tratamento");
    const caixaEl = document.getElementById("caixa");
    const aviso = document.getElementById("avisoDuplicidade");
    const btnSalvar = document.getElementById("btnSalvarMedicao");

    if (!aviso || !btnSalvar) return; 

    // Se todos estiverem preenchidos, faz a checagem
    if (turnoEl.value && tratamentoEl.value && caixaEl.value) {
        try {
            const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"), limit(40));
            const snap = await getDocs(q);

            const hojeStr = new Date().toLocaleDateString();
            let duplicado = false;

            snap.forEach(doc => {
                const d = doc.data();
                if (d.timestamp) {
                    const docDataStr = d.timestamp.toDate().toLocaleDateString();
                    if (docDataStr === hojeStr && d.turno === turnoEl.value && d.tratamento === tratamentoEl.value && d.caixa === caixaEl.value) {
                        duplicado = true;
                    }
                }
            });

            if (duplicado) {
                aviso.style.display = "block";
                btnSalvar.disabled = true; // Desativa o botão para impedir salvar
                btnSalvar.style.backgroundColor = "#6c757d"; // Deixa cinza
                btnSalvar.innerText = "Combinação já registrada!";
            } else {
                aviso.style.display = "none";
                btnSalvar.disabled = false; // Libera o botão
                btnSalvar.style.backgroundColor = "#007bff"; 
                btnSalvar.innerText = "Salvar Medição";
            }
            
        } catch (err) {
            console.error("Erro no radar:", err);
        }
    } else {
        aviso.style.display = "none";
        btnSalvar.disabled = false;
        btnSalvar.style.backgroundColor = "#007bff"; 
        btnSalvar.innerText = "Salvar Medição";
    }
}

// Escuta qualquer mudança nas caixas para ativar o radar
document.addEventListener('change', (e) => {
    if (e.target.id === 'turno' || e.target.id === 'tratamento' || e.target.id === 'caixa') {
        verificarDuplicidade();
    }
});

// ==========================================
// EVENTOS DE CLIQUE GERAIS E PLANILHA
// ==========================================
document.addEventListener('click', async (e) => {
    
    if (e.target.id === 'loginGoogleBtn') {
        e.target.innerText = "Aguarde...";
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithPopup(auth, provider);
        } catch (err) {
            e.target.innerText = "Entrar com Google";
            if (err.code === 'auth/popup-blocked') { alert("Seu navegador bloqueou o pop-up de login."); } 
            else { alert("Falha no login."); }
        }
    }

    if (e.target.id === 'btnSalvarCadastro') {
        const nomeEl = document.getElementById("nomeCadastro");
        if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
        e.target.innerText = "Salvando...";
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), { nome: nomeEl.value, email: auth.currentUser.email, admin: false, dataCadastro: new Date() });
            window.location.reload();
        } catch (err) { alert("Erro: " + err.message); }
    }

    if (e.target.id === 'btnAtualizarPerfil') {
        const novoNome = document.getElementById("editNome")?.value;
        if (!novoNome) return alert("O nome não pode ser vazio.");
        e.target.innerText = "Atualizando...";
        try {
            await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { nome: novoNome });
            alert("Nome atualizado com sucesso!");
            window.location.reload();
        } catch (err) { alert("Erro: " + err.message); e.target.innerText = "Salvar Alterações"; }
    }

    // ABRIR JANELA DE EDIÇÃO
    const btnEditar = e.target.closest('.btn-editar');
    if (btnEditar) {
        if (!isAdmin) return alert("Acesso negado.");
        const modal = document.getElementById("modalEditar");
        if (!modal) return alert("Erro no HTML da janela modal.");

        const idDoc = btnEditar.getAttribute('data-id');
        const d = registrosAtuais[idDoc]; 
        if (!d) return alert("Erro ao recuperar dados da medição.");

        document.getElementById("editIdDoc").value = idDoc;
        setEditVal("editTurno", d.turno);
        setEditVal("editTratamento", d.tratamento);
        setEditVal("editCaixa", d.caixa);
        setEditVal("editAmonia", d.amonia);
        setEditVal("editNitrito", d.nitrito);
        setEditVal("editAlcalinidade", d.alcalinidade);
        setEditVal("editDureza", d.dureza);
        setEditVal("editPh", d.ph);
        setEditVal("editOd", d.od);
        setEditVal("editTemperatura", d.temperatura);
        setEditVal("editCondutividade", d.condutividade);
        setEditVal("editSalinidade", d.salinidade);
        setEditVal("editSolidos", d.solidos);

        modal.style.display = "flex";
    }

    // FECHAR A JANELA DE EDIÇÃO
    if (e.target.id === 'btnCancelarEdicao') {
        document.getElementById("modalEditar").style.display = "none";
    }

    // EXCLUIR HISTÓRICO
    const btnExcluir = e.target.closest('.btn-excluir-novo');
    if (btnExcluir) {
        if (!isAdmin) return alert("Acesso negado."); 
        const idDoc = btnExcluir.getAttribute('data-id');
        if (confirm("Tem certeza que deseja apagar esta medição? Isso não pode ser desfeito.")) {
            try {
                await deleteDoc(doc(db, "medicoes", idDoc));
                carregarHistorico(); 
            } catch (err) { alert("Erro: " + err.message); }
        }
    }

    // ADMIN: DAR OU REMOVER PERMISSÃO
    const btnToggleAdmin = e.target.closest('.btn-toggle-admin');
    if (btnToggleAdmin) {
        if (!isAdmin) return alert("Acesso negado.");
        const alvoUid = btnToggleAdmin.getAttribute('data-uid');
        const acao = btnToggleAdmin.getAttribute('data-status');
        const vaiSerAdmin = (acao === 'dar');

        const msgConfirmacao = vaiSerAdmin 
            ? "Tem certeza que deseja promover este usuário a Administrador?" 
            : "Tem certeza que deseja remover o acesso de Administrador deste usuário?";

        if (confirm(msgConfirmacao)) {
            try {
                await updateDoc(doc(db, "usuarios", alvoUid), { admin: vaiSerAdmin });
                alert("Permissões atualizadas com sucesso!");
                carregarListaUsuarios(); 
            } catch (err) { alert("Erro ao atualizar permissão: " + err.message); }
        }
    }

    // NAVEGAÇÃO DE ABAS
    const abas = [
        { btn: 'tabRegistro', tela: 'secaoRegistro' },
        { btn: 'tabHistorico', tela: 'secaoHistorico' },
        { btn: 'tabPerfil', tela: 'secaoPerfil' },
        { btn: 'tabAdmin', tela: 'secaoAdmin' }
    ];

    const clicouNumaAba = abas.find(a => a.btn === e.target.id);
    if (clicouNumaAba) {
        abas.forEach(aba => {
            const btnEl = document.getElementById(aba.btn);
            const telaEl = document.getElementById(aba.tela);
            if (btnEl && telaEl) {
                if (aba.btn === e.target.id) {
                    telaEl.style.display = "block";
                    btnEl.style.backgroundColor = "#007bff"; 
                } else {
                    telaEl.style.display = "none";
                    btnEl.style.backgroundColor = "#6c757d"; 
                }
            }
        });
        if (e.target.id === 'tabHistorico') carregarHistorico();
        if (e.target.id === 'tabAdmin') carregarListaUsuarios();
    }

    if (e.target.id === 'btnAtualizarHistorico') carregarHistorico();
    if (e.target.id === 'btnSair') { await signOut(auth); window.location.reload(); }

    // GERAÇÃO DO RELATÓRIO
    if (e.target.id === 'btnBaixarRelatorio') {
        if (!isAdmin) return alert("Acesso Negado."); 
        e.target.innerText = "Gerando...";
        try {
            const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
            const gruposMap = {};
            const gruposArray = [];

            snap.forEach(doc => {
                const d = doc.data();
                if (!d.timestamp) return;

                const dt = d.timestamp.toDate();
                const dataStr = dt.toLocaleDateString();
                const turno = d.turno || "Sem Turno";
                const chaveGrupo = `${dataStr}_${turno}`;

                if (!gruposMap[chaveGrupo]) {
                    const novoGrupo = { dataStr: dataStr, turno: turno, ordem: dt.getTime(), medicoes: {} };
                    gruposMap[chaveGrupo] = novoGrupo;
                    gruposArray.push(novoGrupo);
                }

                const chaveCaixa = `${d.tratamento}_${d.caixa}`;
                if (!gruposMap[chaveGrupo].medicoes[chaveCaixa]) {
                    gruposMap[chaveGrupo].medicoes[chaveCaixa] = { ...d, dataObj: dt };
                }
            });

            gruposArray.sort((a, b) => b.ordem - a.ordem);

            const sequenciaCaixas = [
                { t: "Tratamento 1", c: "Caixa 1" }, { t: "Tratamento 1", c: "Caixa 2" }, { t: "Tratamento 1", c: "Caixa 3" },
                { t: "Tratamento 2", c: "Caixa 1" }, { t: "Tratamento 2", c: "Caixa 2" }, { t: "Tratamento 2", c: "Caixa 3" },
                { t: "Tratamento 3", c: "Caixa 1" }, { t: "Tratamento 3", c: "Caixa 2" }, { t: "Tratamento 3", c: "Caixa 3" }
            ];

            const cabecalho = "Data e Hora;Turno;Tratamento;Caixa;Amônia;Nitrito;Alcalinidade;Dureza;pH;OD;Temperatura;Condutividade;Salinidade;Sólidos Totais;Coletor\n";
            let csv = "\ufeff"; 
            const formatarNumero = (num) => (num !== null && num !== undefined && num !== "") ? String(num).replace('.', ',') : "";

            gruposArray.forEach((grupo, index) => {
                csv += cabecalho; 
                sequenciaCaixas.forEach(caixaAlvo => {
                    const chave = `${caixaAlvo.t}_${caixaAlvo.c}`;
                    const med = grupo.medicoes[chave];

                    if (med) {
                        const horaFormatada = `${med.dataObj.toLocaleDateString()} ${med.dataObj.toLocaleTimeString().substring(0,5)}`;
                        csv += `${horaFormatada};${med.turno};${med.tratamento};${med.caixa};${formatarNumero(med.amonia)};${formatarNumero(med.nitrito)};${formatarNumero(med.alcalinidade)};${formatarNumero(med.dureza)};${formatarNumero(med.ph)};${formatarNumero(med.od)};${formatarNumero(med.temperatura)};${formatarNumero(med.condutividade)};${formatarNumero(med.salinidade)};${formatarNumero(med.solidos)};${med.coletor || ""}\n`;
                    } else {
                        csv += `;${grupo.turno};${caixaAlvo.t};${caixaAlvo.c};;;;;;;;;;;\n`;
                    }
                });
                if (index < gruposArray.length - 1) csv += "\n\n";
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "relatorio_bagrinhos.csv";
            link.click();
        } catch (err) { alert("Erro no relatório: " + err.message); }
        finally { e.target.innerText = "📥 Planilha"; }
    }
});

// ==========================================
// SALVAR OU EDITAR MEDIÇÃO
// ==========================================
document.addEventListener('submit', async (e) => {
    
    // SALVAR NOVA MEDIÇÃO
    if (e.target.id === 'formMedicao') {
        e.preventDefault();
        
        // Proteção EXTRA: Se o botão estiver desativado (por causa da duplicidade), não faz nada.
        const btn = document.getElementById("btnSalvarMedicao");
        if(btn && btn.disabled) return;
        
        if(btn) btn.disabled = true;
        
        try {
            await addDoc(collection(db, "medicoes"), {
                coletor: document.getElementById("userNameHeader")?.innerText || "N/A",
                email: auth.currentUser?.email || "N/A",
                turno: document.getElementById("turno").value,
                tratamento: document.getElementById("tratamento").value,
                caixa: document.getElementById("caixa").value,
                amonia: getVal("amonia"),
                nitrito: getVal("nitrito"),
                alcalinidade: getVal("alcalinidade"),
                dureza: getVal("dureza"),
                ph: getVal("ph"),
                od: getVal("od"),
                temperatura: getVal("temperatura"),
                condutividade: getVal("condutividade"),
                salinidade: getVal("salinidade"),
                solidos: getVal("solidos"),
                timestamp: serverTimestamp()
            });
            alert("Medição salva com sucesso!");
            
            // ===== O RESET INTELIGENTE AQUI =====
            // Limpa todos os números
            document.querySelectorAll('#formMedicao input[type="number"]').forEach(input => input.value = '');
            // Limpa o Tratamento e a Caixa para forçar a pessoa a escolher o próximo tanque
            document.getElementById("tratamento").value = "";
            document.getElementById("caixa").value = "";
            // O Turno continua intacto (ex: Manhã)
            
            // Reavalia a duplicidade (que agora vai dar falso porque limpamos a caixa)
            verificarDuplicidade();

        } catch (err) { 
            alert("Erro ao salvar: " + err.message); 
        } finally { 
            if(btn && btn.innerText === "Salvar Medição") btn.disabled = false; 
        }
    }

    // SALVAR EDIÇÃO DE UMA MEDIÇÃO
    if (e.target.id === 'formEditarMedicao') {
        e.preventDefault();
        if (!isAdmin) return alert("Acesso negado.");
        
        const idDoc = document.getElementById("editIdDoc").value;
        const btn = document.querySelector("#formEditarMedicao button[type='submit']");
        if(btn) btn.disabled = true;

        const getEditVal = (id) => {
            const el = document.getElementById(id);
            return (el && el.value !== "") ? parseFloat(el.value) : null;
        };

        try {
            await updateDoc(doc(db, "medicoes", idDoc), {
                turno: document.getElementById("editTurno").value,
                tratamento: document.getElementById("editTratamento").value,
                caixa: document.getElementById("editCaixa").value,
                amonia: getEditVal("editAmonia"),
                nitrito: getEditVal("editNitrito"),
                alcalinidade: getEditVal("editAlcalinidade"),
                dureza: getEditVal("editDureza"),
                ph: getEditVal("editPh"),
                od: getEditVal("editOd"),
                temperatura: getEditVal("editTemperatura"),
                condutividade: getEditVal("editCondutividade"),
                salinidade: getEditVal("editSalinidade"),
                solidos: getEditVal("editSolidos")
            });
            alert("Registro atualizado com sucesso!");
            
            const modal = document.getElementById("modalEditar");
            if (modal) modal.style.display = "none";
            
            carregarHistorico(); 
        } catch (err) {
            alert("Erro ao editar: " + err.message);
        } finally {
            if(btn) btn.disabled = false;
        }
    }
});