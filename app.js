import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Função que controla as telas com segurança
function alternarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    const telaAlvo = document.getElementById(id);
    if (telaAlvo) telaAlvo.classList.add('ativa');
}

// 1. INICIALIZAÇÃO E TRATAMENTO DE LOGIN
async function start() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await getRedirectResult(auth);
        if (result?.user) console.log("Login por redirecionamento detectado!");
    } catch (e) { console.error("Erro na inicialização:", e); }

    // O MONITOR SÓ MUDA A TELA DEPOIS QUE O FIREBASE RESPONDE
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const snap = await getDoc(doc(db, "usuarios", user.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    // Preenche a UI com segurança
                    if(document.getElementById("userNameHeader")) document.getElementById("userNameHeader").innerText = d.nome;
                    if(document.getElementById("userEmailHeader")) document.getElementById("userEmailHeader").innerText = user.email;
                    if(document.getElementById("userIdText")) document.getElementById("userIdText").innerText = user.uid;
                    if(document.getElementById("userIniciais")) document.getElementById("userIniciais").innerText = d.nome.charAt(0).toUpperCase();
                    alternarTela("telaApp");
                } else {
                    alternarTela("telaCadastro");
                }
            } catch (err) {
                console.error(err);
                alternarTela("telaLogin");
            }
        } else {
            alternarTela("telaLogin");
        }
    });
}

// Inicia o motor
start();

// 2. AÇÕES DE LOGIN E CADASTRO
document.getElementById("loginGoogleBtn").onclick = async () => {
    document.getElementById("loginGoogleBtn").innerText = "Conectando...";
    try {
        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
            await signInWithRedirect(auth, provider);
        } else {
            await signInWithPopup(auth, provider);
        }
    } catch (e) {
        alert("Erro no login: " + e.message);
        document.getElementById("loginGoogleBtn").innerText = "Entrar com Google";
    }
};

document.getElementById("btnSalvarCadastro").onclick = async () => {
    const nome = document.getElementById("nomeCadastro").value;
    if (!nome) return alert("Digite seu nome!");
    try {
        await setDoc(doc(db, "usuarios", auth.currentUser.uid), {
            nome: nome, email: auth.currentUser.email, data: new Date()
        });
        window.location.reload(); // Recarrega para o onAuthStateChanged assumir o controle
    } catch (e) { alert(e.message); }
};

// 3. AÇÕES DO APP
const form = document.getElementById("formMedicao");
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btnSalvarMedicao");
        btn.disabled = true;
        try {
            await addDoc(collection(db, "medicoes"), {
                coletor: document.getElementById("userNameHeader").innerText,
                tanque: document.getElementById("tanque").value,
                amonia: parseFloat(document.getElementById("amonia").value),
                ph: parseFloat(document.getElementById("ph").value),
                timestamp: serverTimestamp()
            });
            alert("✅ Medição salva!");
            form.reset();
        } catch (e) { alert("Erro: " + e.message); }
        finally { btn.disabled = false; }
    };
}

document.getElementById("btnBaixarRelatorio").onclick = async () => {
    try {
        const snap = await getDocs(query(collection(db, "medicoes"), orderBy("timestamp", "desc")));
        let csv = "\ufeffData,Coletor,Tanque,Amonia,pH\n";
        snap.forEach(doc => {
            const d = doc.data();
            const dt = d.timestamp ? d.timestamp.toDate().toLocaleDateString() : "";
            csv += `${dt},${d.coletor},${d.tanque},${d.amonia},${d.ph}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "relatorio.csv";
        link.click();
    } catch (e) { alert(e.message); }
};

// 4. NAVEGAÇÃO INTERNA E SAIR
document.getElementById("tabRegistro").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "block";
    document.getElementById("secaoPerfil").style.display = "none";
};
document.getElementById("tabPerfil").onclick = () => {
    document.getElementById("secaoRegistro").style.display = "none";
    document.getElementById("secaoPerfil").style.display = "block";
};
document.getElementById("btnSair").onclick = () => signOut(auth).then(() => window.location.reload());