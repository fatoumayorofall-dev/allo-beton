import { px } from './catalog';

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'products'; slugs: string[] };

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: number;
  date: string;
  image: string;
  blocks: ArticleBlock[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'invitee-mariage-parfaite',
    title: 'Invitée à un mariage : le guide pour briller sans voler la vedette',
    excerpt: 'Tenue, chaussures, bijoux : nos règles d\'or pour être parfaite de la mairie jusqu\'à la dernière danse.',
    category: 'Guide de style',
    readingTime: 4,
    date: '2026-09-12',
    image: px(1616096, 1200),
    blocks: [
      { type: 'p', text: 'Au Sénégal, un mariage se vit souvent sur plusieurs jours et plusieurs tenues. L\'enjeu : être élégante à chaque étape, rester à l\'aise pendant des heures, et laisser à la mariée la place qui lui revient.' },
      { type: 'h', text: '1. Choisir sa couleur' },
      { type: 'p', text: 'Évitez le blanc et l\'ivoire, réservés à la mariée, sauf si le dress code le demande. Les tons bijoux (émeraude, fuchsia, bleu nuit) et les pastels poudrés sont toujours gagnants, en bazin comme en satin.' },
      { type: 'h', text: '2. Penser au confort des pieds' },
      { type: 'p', text: 'Un talon fin de 8 à 9 cm pour la cérémonie, et une paire plate dans le sac pour la soirée dansante. Nos escarpins Aminata ont une semelle à mémoire de forme justement pour les longues journées.' },
      { type: 'products', slugs: ['escarpins-velours-aminata', 'sandales-talons-perlees-linguere', 'sandales-dorees-ndeye'] },
      { type: 'h', text: '3. Un seul bijou fort' },
      { type: 'p', text: 'Si votre tenue est brodée, misez sur des bijoux discrets. Si elle est unie, osez la parure ou les grandes créoles. Et toujours une pochette : les grands sacs n\'ont pas leur place dans les photos.' },
      { type: 'tip', text: 'Préparez votre pochette la veille : rouge à lèvres, mouchoirs, pansements, un peu d\'argent liquide et votre téléphone chargé.' },
      { type: 'products', slugs: ['pochette-soiree-perles', 'parure-perles-mariage', 'bague-solitaire'] },
    ],
  },
  {
    slug: 'cinq-facons-porter-foulard',
    title: '5 façons de porter le foulard en soie',
    excerpt: 'En turban, au cou, au poignet ou sur votre sac : un seul carré de soie, cinq allures différentes.',
    category: 'Astuces',
    readingTime: 3,
    date: '2026-08-28',
    image: px(1078958, 1200),
    blocks: [
      { type: 'p', text: 'Le carré de soie est l\'accessoire le plus polyvalent de votre garde-robe. Voici nos cinq façons préférées de le nouer.' },
      { type: 'h', text: '1. En turban' },
      { type: 'p', text: 'Pliez-le en triangle, posez la pointe sur la nuque, croisez les pans sur le front et nouez à l\'arrière. Avec des créoles dorées, l\'effet est immédiat.' },
      { type: 'h', text: '2. Noué au cou' },
      { type: 'p', text: 'Roulé en bandeau fin et noué sur le côté : le détail chic d\'une chemise blanche ou d\'une veste de tailleur.' },
      { type: 'h', text: '3. Sur l\'anse du sac' },
      { type: 'p', text: 'Enroulez-le autour de la poignée de votre sac à main : une touche de couleur qui change toute la silhouette.' },
      { type: 'h', text: '4. En ceinture' },
      { type: 'p', text: 'Passé dans les passants d\'un pantalon large, il remplace la ceinture avec beaucoup de douceur.' },
      { type: 'h', text: '5. Au poignet' },
      { type: 'p', text: 'Plié finement et noué autour du poignet, il se marie avec une montre dorée.' },
      { type: 'products', slugs: ['foulard-soie-imprime', 'sac-a-main-fatou', 'boucles-creoles-xl'] },
    ],
  },
  {
    slug: 'tabaski-korite-tenues-fete',
    title: 'Tabaski & Korité : nos tenues pour briller en famille',
    excerpt: 'Bazin, kaftan brodé ou robe en wax : comment composer une tenue de fête élégante, de la tête aux pieds.',
    category: 'Occasions',
    readingTime: 5,
    date: '2026-08-10',
    image: px(2918534, 1200),
    blocks: [
      { type: 'p', text: 'Les fêtes sont l\'occasion de sortir ses plus belles pièces. On les prépare longtemps à l\'avance : voici comment composer une tenue harmonieuse.' },
      { type: 'h', text: 'La pièce maîtresse' },
      { type: 'p', text: 'Un grand boubou en bazin riche brodé pour la tradition, ou un kaftan satiné pour plus de fluidité. Choisissez une couleur qui vous illumine, puis construisez le reste autour.' },
      { type: 'products', slugs: ['grand-boubou-diarra', 'kaftan-brode-femme', 'robe-wax-dior'] },
      { type: 'h', text: 'Les accessoires' },
      { type: 'p', text: 'Reprenez l\'or des broderies dans vos bijoux et vos chaussures. Une pochette perlée et des sandales à talons assorties terminent la silhouette.' },
      { type: 'tip', text: 'Commandez au moins 10 jours avant la fête : cela laisse le temps d\'un éventuel échange de taille.' },
      { type: 'products', slugs: ['sandales-talons-perlees-linguere', 'pochette-soiree-perles', 'collier-plaque-or'] },
    ],
  },
  {
    slug: 'entretenir-sac-cuir',
    title: 'Entretenir son sac en cuir pour qu\'il dure des années',
    excerpt: 'Chaleur, humidité, poussière : les gestes simples qui préservent la beauté du cuir sous le climat dakarois.',
    category: 'Entretien',
    readingTime: 3,
    date: '2026-07-22',
    image: px(1152077, 1200),
    blocks: [
      { type: 'p', text: 'Un beau sac en cuir se patine avec le temps, à condition de lui donner quelques soins. Sous notre climat chaud et parfois humide, trois règles suffisent.' },
      { type: 'h', text: 'Le nourrir' },
      { type: 'p', text: 'Une fois par mois, appliquez un baume incolore avec un chiffon doux, en petits cercles, puis laissez sécher une nuit.' },
      { type: 'h', text: 'Le protéger' },
      { type: 'p', text: 'Ne le laissez jamais au soleil derrière une vitre de voiture. En cas de pluie, épongez sans frotter et laissez sécher loin d\'une source de chaleur.' },
      { type: 'h', text: 'Le ranger' },
      { type: 'p', text: 'Rembourrez-le de papier de soie pour qu\'il garde sa forme, et glissez-le dans sa pochette en tissu, jamais dans du plastique.' },
      { type: 'tip', text: 'Chaque sac Fabima en cuir est livré avec sa pochette de protection.' },
      { type: 'products', slugs: ['sac-a-main-fatou', 'cabas-cuir-weekend', 'sac-seau-khady'] },
    ],
  },
];
