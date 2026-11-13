// Réglages du site : liens et textes réutilisés partout.
export const SITE = {
  nom: 'Table de JDR',
  slogan: 'Ta TV posée à plat devient un plateau de jeu animé.',
  description:
    "Appli d'animation de jeu de rôle : une TV posée à plat sert de plateau, le MJ pilote tout depuis son PC. Brouillard de guerre, figurines animées, créateur de carte, déclencheurs, dés et sons.",
};

// Chemin d'un fichier du dossier public/, quel que soit le sous-dossier où le site est hébergé.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (chemin: string) => `${base}/${chemin.replace(/^\//, '')}`;

// Texte sans accents ni majuscules, pour la recherche.
export const simple = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Emprise d'un objet ou d'une figurine, en cases.
export const taille = (w: number, h: number) => (w === 1 && h === 1 ? '1 case' : `${w} × ${h} cases`);
