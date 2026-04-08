import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// ==========================================
// FUNÇÃO HISTÓRICO (AGORA COM BOTÃO VERMELHO)
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
        snap.forEach(doc => {
            const d = doc.data();
            const idDoc = doc.id;
            const dataHora = d.timestamp ? d.timestamp.toDate().toLocaleString('pt-BR').substring(0, 16) : "Sem data";
            
            // Botão alterado de lixeira para "Excluir" em vermelho
            const botaoExcluirHtml = isAdmin ? `<button class="btn-excluir-novo" data-id="${idDoc}">Excluir</button>` : '';

            html += `
            <div class="card-historico" id="card-${idDoc}">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${d.tratamento} - ${d.caixa}</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #007bff;">${dataHora}</span>
                        ${botaoExcluirHtml}
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
// FUNÇÃO PAINEL ADMIN (CARREGAR USUÁRIOS)
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
            
            // Impede que você remova o seu próprio admin acidentalmente
            const isEuMesmo = (uId === auth.currentUser.uid);
            
            let btnAcao = "";
            if (isEuMesmo) {
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
// MONITOR DE AUTENTICAÇÃO (BLINDADO)
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
                    
                    // Revela a aba Admin
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
// EVENTOS DE CLIQUE (ABAS E ADMINISTRAÇÃO)
// ==========================================
document.addEventListener('click', async (e) => {
    
    // LOGIN E CADASTRO
    if (e.target.id === 'loginGoogleBtn') {
        e.target.innerText = "Aguarde...";
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithPopup(auth, provider);
        } catch (err) {
            e.target.innerText = "Entrar com Google";
            if (err.code === 'auth/popup-blocked') {
                alert("Seu navegador bloqueou o pop-up de login.");
            } else { alert("Falha no login."); }
        }
    }

    if (e.target.id === 'btnSalvarCadastro') {
        const nomeEl = document.getElementById("nomeCadastro");
        if (!nomeEl || !nomeEl.value) return alert("Digite seu nome!");
        e.target.innerText = "Salvando...";
        try {
            await setDoc(doc(db, "usuarios", auth.currentUser.uid), { 
                nome: nomeEl.value, email: auth.currentUser.email, admin: false, dataCadastro: new Date() 
            });
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

    // EXCLUIR HISTÓRICO (BOTÃO VERMELHO NOVO)
    const btnExcluir = e.target.closest('.btn-excluir-novo');
    if (btnExcluir) {
        if (!isAdmin) return alert("Apenas administradores podem apagar registros."); 

        const idDoc = btnExcluir.getAttribute('data-id');
        if (confirm("Tem certeza que deseja apagar esta medição? Isso não pode ser desfeito.")) {
            try {
                await deleteDoc(doc(db, "medicoes", idDoc));
                carregarHistorico(); 
            } catch (err) { alert("Erro: " + err.message); }
        }
    }

    // DAR OU REMOVER PODER DE ADMIN DE OUTRO USUÁRIO
    const btnToggleAdmin = e.target.closest('.btn-toggle-admin');
    if (btnToggleAdmin) {
        if (!isAdmin) return alert("Acesso negado.");
        const alvoUid = btnToggleAdmin.getAttribute('data-uid');
        const acao = btnToggleAdmin.getAttribute('data-status');
        const vaiSerAdmin = (acao === 'dar');

        const msgConfirmacao = vaiSerAdmin 
            ? "Tem certeza que deseja promover este usuário a Administrador? Ele poderá apagar coletas e baixar a base de dados." 
            : "Tem certeza que deseja remover o acesso de Administrador deste usuário?";

        if (confirm(msgConfirmacao)) {
            try {
                await updateDoc(doc(db, "usuarios", alvoUid), { admin: vaiSerAdmin });
                alert("Permissões atualizadas com sucesso!");
                carregarListaUsuarios(); // Recarrega a tela na hora
            } catch (err) { alert("Erro ao atualizar permissão: " + err.message); }
        }
    }

    // ==========================================
    // SISTEMA DE TROCA DE ABAS (AGORA SÃO 4)
    // ==========================================
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
                    btnEl.style.backgroundColor = "#007bff"; // Ativa (Azul)
                } else {
                    telaEl.style.display = "none";
                    btnEl.style.backgroundColor = "#6c757d"; // Inativa (Cinza)
                }
            }
        });

        // Dispara as funções de carregar dados dependendo de qual aba abriu
        if (e.target.id === 'tabHistorico') carregarHistorico();
        if (e.target.id === 'tabAdmin') carregarListaUsuarios();
    }

    if (e.target.id === 'btnAtualizarHistorico') carregarHistorico();
    
    if (e.target.id === 'btnSair') {
        await signOut(auth);
        window.location.reload();
    }

    // ==============================================
    // GERAÇÃO DO RELATÓRIO EM BLOCOS
    // ==============================================
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
// SALVAR MEDIÇÃO
// ==========================================
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'formMedicao') {
        e.preventDefault();
        const btn = document.getElementById("btnSalvarMedicao");
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
            document.querySelectorAll('#formMedicao input[type="number"]').forEach(input => input.value = '');
        } catch (err) { 
            alert("Erro ao salvar: " + err.message); 
        } finally { 
            if(btn) btn.disabled = false; 
        }
    }
});