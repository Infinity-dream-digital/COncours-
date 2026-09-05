import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjbVjLLEWQyJFkXG-g67q3zQfee69Wo-I",
  authDomain: "concours-13ebb.firebaseapp.com",
  projectId: "concours-13ebb",
  storageBucket: "concours-13ebb.firebasestorage.app",
  messagingSenderId: "34631527839",
  appId: "1:34631527839:web:14580c393acd7736efe1aa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Générer une empreinte unique du téléphone / appareil
function getDeviceFingerprint() {
  const nav = window.navigator;
  const screen = window.screen;
  const rawString = `${nav.userAgent}-${screen.width}x${screen.height}-${nav.language}`;
  
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash);
}

// 2. Récupérer l'adresse IP publique du votant
async function getUserIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (e) {
    console.warn("Impossible de récupérer l'IP :", e);
    return "IP_UNKNOWN";
  }
}

// 3. Charger les candidats
async function loadCandidatesSelect() {
  const selectEl = document.getElementById('candidateSelect');
  if (!selectEl) return;

  try {
    const snapshot = await getDocs(collection(db, 'candidates'));
    selectEl.innerHTML = '<option value="">-- Sélectionnez un candidat --</option>';

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const displayName = data.name || data.nom || "Candidat";
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = displayName;
      selectEl.appendChild(option);
    });
  } catch (err) {
    console.error("Erreur lors du chargement des candidats :", err);
  }
}

// 4. Traitement du vote
const voteForm = document.getElementById('voteForm');

if (voteForm) {
  voteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorEl = document.getElementById('voteError');
    if (errorEl) errorEl.textContent = "";

    const voterName = document.getElementById('voterName')?.value?.trim();
    const candidateId = document.getElementById('candidateSelect')?.value;

    if (!voterName || !candidateId) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    // VERROU 1 : Cache local du navigateur (blocage instantané)
    if (localStorage.getItem('has_voted_smallboost2026')) {
      alert("Cet appareil a déjà été utilisé pour enregistrer un vote.");
      return;
    }

    try {
      const userIp = await getUserIP();
      const deviceFp = getDeviceFingerprint();

      // VERROU 2 : Vérification de l'ADRESSE IP dans Firestore
      if (userIp !== "IP_UNKNOWN") {
        const ipQuery = await getDocs(
          query(collection(db, 'votes'), where('voter_ip', '==', userIp))
        );
        if (!ipQuery.empty) {
          alert("Un vote a déjà été enregistré depuis cet appareil ou cette connexion Wi-Fi !");
          return;
        }
      }

      // VERROU 3 : Vérification de l'EMPREINTE D'APPAREIL dans Firestore
      const fpQuery = await getDocs(
        query(collection(db, 'votes'), where('device_fp', '==', deviceFp))
      );
      if (!fpQuery.empty) {
        alert("Cet appareil a déjà servi à voter.");
        return;
      }

      // Enregistrement du vote dans Firestore
      await addDoc(collection(db, 'votes'), {
        candidate_id: candidateId,
        voter_name: voterName,
        voter_ip: userIp,
        device_fp: deviceFp,
        created_at: serverTimestamp()
      });

      // Mettre le marqueur dans le navigateur
      localStorage.setItem('has_voted_smallboost2026', 'true');

      alert("Votre vote a été validé avec succès ! Merci de votre participation.");
      voteForm.reset();

    } catch (err) {
      console.error("Erreur lors du vote :", err);
      if (errorEl) errorEl.textContent = "Erreur lors de l'enregistrement : " + err.message;
    }
  });
}

loadCandidatesSelect();