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

import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

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
const auth = getAuth(app);

let confirmationResultGlobal = null;

// Initialisation du reCAPTCHA invisible pour Firebase
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'invisible'
});

// 1. Charger les candidats
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

// 2. Action du bouton : Envoyer le code SMS
document.getElementById('sendSmsBtn')?.addEventListener('click', async () => {
  let phoneNumber = document.getElementById('voterPhone')?.value?.trim();

  if (!phoneNumber) {
    alert("Veuillez entrer votre numéro de téléphone.");
    return;
  }

  // Formatage automatique pour la Côte d'Ivoire si l'indicatif +225 n'est pas saisi
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+225' + phoneNumber;
  }

  try {
    // A. Vérifier si ce numéro a DÉJÀ voté
    const existingVotes = await getDocs(
      query(collection(db, 'votes'), where('voter_phone', '==', phoneNumber))
    );

    if (!existingVotes.empty) {
      alert('Ce numéro de téléphone a déjà été utilisé pour voter !');
      return;
    }

    // B. Envoi du SMS via Firebase
    const appVerifier = window.recaptchaVerifier;
    confirmationResultGlobal = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);

    alert("Un code à 6 chiffres vient de vous être envoyé par SMS.");
    document.getElementById('otpSection').style.display = 'block';
    document.getElementById('sendSmsBtn').style.display = 'none';

  } catch (error) {
    console.error("Erreur SMS :", error);
    alert("Impossible d'envoyer le SMS : " + error.message);
  }
});

// 3. Soumission du vote après validation du code SMS
document.getElementById('voteForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const smsCode = document.getElementById('smsCode')?.value?.trim();
  const selectedCandidateId = document.getElementById('candidateSelect')?.value;
  let phoneNumber = document.getElementById('voterPhone')?.value?.trim();

  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+225' + phoneNumber;
  }

  if (!smsCode || smsCode.length < 6) {
    alert("Veuillez saisir le code à 6 chiffres reçu par SMS.");
    return;
  }

  if (!selectedCandidateId) {
    alert("Veuillez sélectionner un candidat.");
    return;
  }

  try {
    // A. Vérification du code SMS auprès de Firebase
    const userCredential = await confirmationResultGlobal.confirm(smsCode);

    // B. Enregistrement du vote dans Firestore
    await addDoc(collection(db, 'votes'), {
      candidate_id: selectedCandidateId,
      voter_phone: phoneNumber,
      voter_uid: userCredential.user.uid,
      created_at: serverTimestamp()
    });

    alert('Votre vote a été validé avec succès !');
    location.reload();

  } catch (error) {
    console.error("Erreur de validation du vote :", error);
    alert("Code SMS incorrect ou expiré. Veuillez réessayez.");
  }
});

loadCandidatesSelect();