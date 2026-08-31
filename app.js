import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy 
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

const seedCandidates = [
  { name:'Amina Koné', initials:'AK', short_description:'Une solution simple pour rendre le soutien scolaire accessible à chaque enfant.', full_project:'Amina développe une plateforme mobile de tutorat communautaire qui connecte des étudiants volontaires avec des enfants ayant besoin de se faire accompagner. Son projet combine contenus courts, suivi personnalisé et entraide locale.', photo_url:'' },
  { name:'Koffi NGuessan', initials:'KN', short_description:'Transformer les déchets plastiques en objets utiles, beaux et durables.', full_project:'Koffi transforme les déchets plastiques collectés dans les quartiers en mobilier et objets du quotidien. Avec son atelier-école, il veut créer des emplois verts tout en sensibilisant les jeunes à l économie circulaire.', photo_url:'' },
  { name:'Mariam Traoré', initials:'MT', short_description:'Donner une voix aux jeunes talents créatifs de nos quartiers.', full_project:'Mariam crée une scène itinérante qui repère, accompagne et met en lumière les jeunes talents artistiques. Son projet propose des ateliers, des résidences et des showcases gratuits dans plusieurs communes.', photo_url:'' }
];

let candidates = [];
let votes = [];
let selectedCandidate = null;

const $ = (selector) => document.querySelector(selector);
const openModal = (id) => $(id).classList.add('open');
const closeModal = (id) => $(id).classList.remove('open');
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3500); };
const normalized = (value) => value.trim().toLowerCase();

async function loadData() {
  try {
    // 1. Charger les candidats depuis Firestore
    const candidatesCol = collection(db, 'candidates');
    const candSnapshot = await getDocs(query(candidatesCol, orderBy('name', 'asc')));
    
    if (!candSnapshot.empty) {
      candidates = candSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // Si la collection est vide, injecter les graines (seedCandidates)
      for (const c of seedCandidates) {
        const docRef = await addDoc(candidatesCol, c);
        candidates.push({ id: docRef.id, ...c });
      }
    }

    // 2. Charger les votes depuis Firestore
    const votesCol = collection(db, 'votes');
    const voteSnapshot = await getDocs(votesCol);
    votes = voteSnapshot.docs.map(doc => doc.data());

    // 3. Compter les votes par candidat
    candidates.forEach(c => {
      c.votesCount = votes.filter(v => v.candidate_id === c.id).length;
    });

    renderCandidates();
  } catch (error) {
    console.error("Erreur de chargement Firebase:", error);
  }
}

function renderCandidates() {
  $('#candidateGrid').innerHTML = candidates.map((candidate, index) => {
    const visual = candidate.photo_url
      ? `<img src="${candidate.photo_url}" alt="${candidate.name}" />`
      : `<div class="portrait">${candidate.initials || candidate.name.split(' ').map(p => p[0]).join('').slice(0,2)}</div>`;
    return `<article class="candidate-card" data-id="${candidate.id}"><div class="candidate-visual">${visual}</div><div class="card-info"><span class="rank">FINALISTE 0${index + 1}</span><h3>${candidate.name}</h3><p>${candidate.short_description || ''}</p><div class="card-bottom"><button class="card-vote" data-id="${candidate.id}">Voter pour ce projet →</button><span class="vote-count">${candidate.votesCount || 0} votes</span></div></div></article>`;
  }).join('');

  document.querySelectorAll('.candidate-card').forEach((card) => {
    card.addEventListener('click', (event) => {
      const id = event.target.dataset.id || card.dataset.id;
      const candidate = candidates.find((item) => item.id === id);
      if (!candidate) return;
      if (event.target.classList.contains('card-vote')) return openVote(candidate);
      openProject(candidate);
    });
  });
}

function openProject(candidate) {
  selectedCandidate = candidate;
  $('#projectTitle').textContent = candidate.name;
  $('#projectSummary').textContent = candidate.short_description || '';
  $('#projectFull').textContent = candidate.full_project || '';
  $('#projectVoteButton').onclick = () => { closeModal('projectModal'); openVote(candidate); };
  openModal('projectModal');
}

function openVote(candidate) {
  selectedCandidate = candidate;
  $('#voteCandidateName').textContent = candidate.name;
  $('#voteError').textContent = '';
  $('#voterEmail').value = '';
  openModal('voteModal');
  setTimeout(() => $('#voterEmail').focus(), 100);
}

async function submitVote(event) {
  event.preventDefault();
  const email = normalized($('#voterEmail').value);
  const error = $('#voteError');
  error.textContent = '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { 
    error.textContent = 'Veuillez entrer une adresse e-mail valide.'; 
    return; 
  }

  // Vérification locale rapide
  if (votes.some((vote) => normalized(vote.voter_email) === email)) {
    error.textContent = 'Cette adresse a déjà participé au vote.';
    return;
  }

  try {
    const votesCol = collection(db, 'votes');
    
    // Vérification de doublons directement dans Firestore
    const existingQuery = query(votesCol, where('voter_email', '==', email));
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      error.textContent = 'Cette adresse a déjà participé au vote.';
      votes.push({ voter_email: email, candidate_id: selectedCandidate.id });
      return;
    }

    // Enregistrement du vote dans Firestore
    const newVote = { voter_email: email, candidate_id: selectedCandidate.id };
    await addDoc(votesCol, newVote);

    votes.push(newVote);
    const localCandidate = candidates.find((c) => c.id === selectedCandidate.id);
    if (localCandidate) localCandidate.votesCount = (localCandidate.votesCount || 0) + 1;
    
    closeModal('voteModal');
    renderCandidates();
    showToast('Votre vote a bien été enregistré. Merci !');
  } catch (submitError) {
    console.error(submitError);
    error.textContent = 'Impossible d enregistrer le vote. Réessayez.';
  }
}

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.classList.remove('open'); }));
$('#voteForm').addEventListener('submit', submitVote);

loadData();
