import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Função para trocar de tela sem recarregar a página
function mostrarTela(idTela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.getElementById(idTela).classList.add('ativa');
}

// 1. INICIALIZAÇÃO
async function init() {
    await setPersistence(auth, browserLocalPersistence);
    try {
        await getRedirectResult(auth);
    } catch (e) { console.error("Erro no retorno do Google", e); }
    
    // Monitor de Usuário
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                carregarDadosApp(user, docSnap.data());
                mostrarTela('telaApp');
            } else {
                mostrarTela('telaCadastro');
            }
        } else {
            mostrarTela('telaLogin');
        }
    });
}

// 2. BOTÕES DE LOGIN / CADASTRO
document.getElementById("loginGoogleBtn").onclick = () => {
    document.getElementById("loginGoogleBtn").innerText = "Conectando...";
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        signInWithRedirect(auth, provider);
    } else {
        signInWithPopup(auth, provider);
    }
};

document.getElementById("btnSalvarCadastro").onclick = async () => {
    const nome = document.getElementById("nomeCadastro").value;
    if (!nome) return alert("Digite seu nome!");
    await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
        nome: nome, email: auth.currentUser.email, dataCadastro: new Date()
    });
    location.reload(); // Recarrega uma única vez para limpar o estado
};

// 3. LOGICA DO APP
function carregarDadosApp(user, dados) {
    document.getElementById("userNameHeader").innerText = dados.nome;
    document.getElementById("userEmailHeader").innerText = user.email;
    document.getElementById("editNome").value = dados.nome;
    document.getElementById("userIdText").innerText = user.uid;
    document.getElementById("userIniciais").innerText = dados.nome.charAt(0).toUpperCase();
}

// Troca de Abas internas
document.getElementById("tabRegistro").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "block";
    document.getElementById("secaoPerfil").style.display = "none";
};
document.getElementById("tabPerfil").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "none";
    document.getElementById("secaoPerfil").style.display = "block";
};

// Salvar Medição
document.getElementById("formMedicao").onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSalvarMedicao");
    btn.disabled = true;
    const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;
    
    const dados = {
        coletor: document.getElementById("userNameHeader").innerText,
        email: document.getElementById("userEmailHeader").innerText,
        timestamp: serverTimestamp(),
        turno: document.getElementById("turno").value,
        tratamento: document.getElementById("tratamento").value,
        caixa: document.getElementById("caixa").value,
        amonia: getVal("amonia"), nitrito: getVal("nitrito"),
        ph: getVal("ph"), od: getVal("od"), temperatura: getVal("temperatura")
    };

    await addDoc(collection(db, "medicoes"), dados);
    alert("Salvo!");
    btn.disabled = false;
};

// Baixar CSV
document.getElementById("btnBaixarRelatorio").onclick = async () => {
    const q = query(collection(db, "medicoes"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    let csv = "\ufeffData,Turno,Coletor,Tratamento,Caixa,Amonia,Nitrito,pH,OD,Temp\n";
    snap.forEach(doc => {
        const d = doc.data();
        const dataStr = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : "";
        csv += `${dataStr},${d.turno},${d.coletor},${d.tratamento},${d.caixa},${d.amonia},${d.nitrito},${d.ph},${d.od},${d.temperatura}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_piscicultura.csv";
    link.click();
};

document.getElementById("btnSair").onclick = () => signOut(auth);

// Iniciar tudo
init();