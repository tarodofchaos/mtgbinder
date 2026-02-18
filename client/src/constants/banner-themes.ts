export interface BannerTheme {
  id: string;
  nameKey: string;
  imageUrl: string;
  color?: string;
}

export const BANNER_THEMES: BannerTheme[] = [
  {
    id: 'default',
    nameKey: 'themes.default',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/c/4/c49c9b72-61c0-4e3a-a3a6-994b149398a9.jpg?1739804210', // Omenpath Journey
  },
  {
    id: 'white',
    nameKey: 'colors.white',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/4/4/44dcab01-1d13-4dfc-ae2f-fbaa3dd35087.jpg?1722108717', // Elesh Norn, Mother of Machines
    color: '#f9fafb',
  },
  {
    id: 'blue',
    nameKey: 'colors.blue',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/c/5/c57b4876-5387-4f73-b8e2-8e7bdca8b0bc.jpg?1753786857', // Jin-Gitaxias, Progress Tyrant
    color: '#0ea5e9',
  },
  {
    id: 'black',
    nameKey: 'colors.black',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/d/6/d67be074-cdd4-41d9-ac89-0a0456c4e4b2.jpg?1674057568', // Sheoldred, the Apocalypse
    color: '#a855f7',
  },
  {
    id: 'red',
    nameKey: 'colors.red',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/d/9/d9a4ec18-1da4-43c6-a79a-03fbd4aef3db.jpg?1664411925', // Urabrask, Heretic Praetor
    color: '#ef4444',
  },
  {
    id: 'green',
    nameKey: 'colors.green',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/9/2/92613468-205e-488b-930d-11908477e9f8.jpg?1631051073', // Vorinclex, Monstrous Raider
    color: '#22c55e',
  },
  {
    id: 'artifact',
    nameKey: 'themes.artifact',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/d/5/d5806e68-1054-458e-866d-1f2470f682b2.jpg?1763472900', // The One Ring
    color: '#94a3b8',
  },
  {
    id: 'land',
    nameKey: 'colors.land',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/a/a/aaafb9bc-7cea-4624-a227-595544fa42b0.jpg?1590511888', // Wasteland
    color: '#b45309',
  },
  {
    id: 'vintage',
    nameKey: 'themes.vintage',
    imageUrl: 'https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg?1614638838', // Black Lotus
    color: '#d946ef',
  }
];
