export interface ThemeAvatar {
  id: string;
  name: string;
  imageUrl: string;
  color: string;
}

export interface BannerTheme {
  id: string;
  nameKey: string;
  imageUrls: string[];
  primaryColor: string;
  secondaryColor?: string;
  avatars: ThemeAvatar[];
}

export const BANNER_THEMES: BannerTheme[] = [
  {
    id: 'default',
    nameKey: 'themes.default',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/c/4/c49c9b72-61c0-4e3a-a3a6-994b149398a9.jpg?1739804210', // Omenpath Journey
      'https://cards.scryfall.io/art_crop/front/5/e/5e9ea4c3-1678-4509-847e-07f90c427301.jpg', // Open the Omenpaths
      'https://cards.scryfall.io/art_crop/front/e/0/e0666666-4074-45b9-873b-f5445209c122.jpg', // Planar Nexus
    ],
    primaryColor: '#6366f1', // Indigo
    avatars: [
      { id: 'fblthp', name: 'Fblthp', color: '#6366f1', imageUrl: 'https://cards.scryfall.io/art_crop/front/5/2/52558748-6893-4c72-a9e2-e87d31796b59.jpg' },
      { id: 'quintorius', name: 'Quintorius', color: '#6366f1', imageUrl: 'https://cards.scryfall.io/art_crop/front/a/1/a19b70fe-2826-43da-912c-48ae5301c3aa.jpg' },
    ]
  },
  {
    id: 'white',
    nameKey: 'colors.white',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/4/4/44dcab01-1d13-4dfc-ae2f-fbaa3dd35087.jpg?1722108717', // Elesh Norn, Mother of Machines
      'https://cards.scryfall.io/art_crop/front/c/c/cc0da243-678b-40d0-9bcc-73132d9600cd.jpg', // Elspeth, Knight-Errant
      'https://cards.scryfall.io/art_crop/front/4/5/453f6b5a-27e4-4639-940a-96e246797ca3.jpg', // Gideon of the Trials
    ],
    primaryColor: '#eab308', // Yellow/Gold
    avatars: [
      { id: 'elesh-norn', name: 'Elesh Norn', color: '#f3f4f6', imageUrl: 'https://cards.scryfall.io/art_crop/front/4/4/44dcab01-1d13-4dfc-ae2f-fbaa3dd35087.jpg' },
      { id: 'elspeth', name: 'Elspeth', color: '#f3f4f6', imageUrl: 'https://cards.scryfall.io/art_crop/front/c/c/cc0da243-678b-40d0-9bcc-73132d9600cd.jpg' },
      { id: 'gideon', name: 'Gideon', color: '#f3f4f6', imageUrl: 'https://cards.scryfall.io/art_crop/front/4/5/453f6b5a-27e4-4639-940a-96e246797ca3.jpg' },
    ]
  },
  {
    id: 'blue',
    nameKey: 'colors.blue',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/c/5/c57b4876-5387-4f73-b8e2-8e7bdca8b0bc.jpg?1753786857', // Jin-Gitaxias, Progress Tyrant
      'https://cards.scryfall.io/art_crop/front/3/7/37a3d88f-4ba3-48b2-b924-24a9bf28ef11.jpg', // Jace, the Mind Sculptor
      'https://cards.scryfall.io/art_crop/front/5/9/59ac3b9a-99cd-4a10-8320-f5188f408460.jpg', // Teferi, Time Raveler
    ],
    primaryColor: '#0ea5e9', // Blue
    avatars: [
      { id: 'jace', name: 'Jace', color: '#0ea5e9', imageUrl: 'https://cards.scryfall.io/art_crop/front/3/7/37a3d88f-4ba3-48b2-b924-24a9bf28ef11.jpg' },
      { id: 'teferi', name: 'Teferi', color: '#0ea5e9', imageUrl: 'https://cards.scryfall.io/art_crop/front/5/9/59ac3b9a-99cd-4a10-8320-f5188f408460.jpg' },
      { id: 'jin-gitaxias', name: 'Jin-Gitaxias', color: '#0ea5e9', imageUrl: 'https://cards.scryfall.io/art_crop/front/c/5/c57b4876-5387-4f73-b8e2-8e7bdca8b0bc.jpg' },
    ]
  },
  {
    id: 'black',
    nameKey: 'colors.black',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/d/6/d67be074-cdd4-41d9-ac89-0a0456c4e4b2.jpg?1674057568', // Sheoldred, the Apocalypse
      'https://cards.scryfall.io/art_crop/front/a/1/a17c9107-5903-4996-b31c-03d986bd34d0.jpg', // Liliana of the Veil
      'https://cards.scryfall.io/art_crop/front/f/2/f29f9822-613b-4838-bb0a-48d1ff140f9e.jpg', // Sorin the Mirthless
    ],
    primaryColor: '#a855f7', // Purple/Black
    avatars: [
      { id: 'liliana', name: 'Liliana', color: '#a855f7', imageUrl: 'https://cards.scryfall.io/art_crop/front/a/1/a17c9107-5903-4996-b31c-03d986bd34d0.jpg' },
      { id: 'sorin', name: 'Sorin', color: '#a855f7', imageUrl: 'https://cards.scryfall.io/art_crop/front/f/2/f29f9822-613b-4838-bb0a-48d1ff140f9e.jpg' },
      { id: 'sheoldred', name: 'Sheoldred', color: '#a855f7', imageUrl: 'https://cards.scryfall.io/art_crop/front/d/6/d67be074-cdd4-41d9-ac89-0a0456c4e4b2.jpg' },
    ]
  },
  {
    id: 'red',
    nameKey: 'colors.red',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/d/9/d9a4ec18-1da4-43c6-a79a-03fbd4aef3db.jpg?1664411925', // Urabrask, Heretic Praetor
      'https://cards.scryfall.io/art_crop/front/e/0/e0ff264d-0329-4a99-b1ff-ca70676ee903.jpg', // Chandra, Torch of Defiance
      'https://cards.scryfall.io/art_crop/front/0/e/0ec937bd-68f7-432e-975c-112347c6611a.jpg', // Koth, Fire of Resistance
    ],
    primaryColor: '#ef4444', // Red
    avatars: [
      { id: 'chandra', name: 'Chandra', color: '#ef4444', imageUrl: 'https://cards.scryfall.io/art_crop/front/e/0/e0ff264d-0329-4a99-b1ff-ca70676ee903.jpg' },
      { id: 'koth', name: 'Koth', color: '#ef4444', imageUrl: 'https://cards.scryfall.io/art_crop/front/0/e/0ec937bd-68f7-432e-975c-112347c6611a.jpg' },
      { id: 'urabrask', name: 'Urabrask', color: '#ef4444', imageUrl: 'https://cards.scryfall.io/art_crop/front/d/9/d9a4ec18-1da4-43c6-a79a-03fbd4aef3db.jpg' },
    ]
  },
  {
    id: 'green',
    nameKey: 'colors.green',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/9/2/92613468-205e-488b-930d-11908477e9f8.jpg?1631051073', // Vorinclex, Monstrous Raider
      'https://cards.scryfall.io/art_crop/front/2/b/2b781615-5ca3-4838-8393-01b330959b36.jpg', // Nissa, Who Shakes the World
      'https://cards.scryfall.io/art_crop/front/b/6/b6a4f658-20da-4a6c-956e-cc0c98f797a1.jpg', // Garruk Wildspeaker
    ],
    primaryColor: '#22c55e', // Green
    avatars: [
      { id: 'nissa', name: 'Nissa', color: '#22c55e', imageUrl: 'https://cards.scryfall.io/art_crop/front/2/b/2b781615-5ca3-4838-8393-01b330959b36.jpg' },
      { id: 'garruk', name: 'Garruk', color: '#22c55e', imageUrl: 'https://cards.scryfall.io/art_crop/front/b/6/b6a4f658-20da-4a6c-956e-cc0c98f797a1.jpg' },
      { id: 'vorinclex', name: 'Vorinclex', color: '#22c55e', imageUrl: 'https://cards.scryfall.io/art_crop/front/9/2/92613468-205e-488b-930d-11908477e9f8.jpg' },
    ]
  },
  {
    id: 'artifact',
    nameKey: 'themes.artifact',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/d/5/d5806e68-1054-458e-866d-1f2470f682b2.jpg?1763472900', // The One Ring
      'https://cards.scryfall.io/art_crop/front/0/5/0500e58f-0c99-43db-98c2-27450779946e.jpg', // Karn Liberated
      'https://cards.scryfall.io/art_crop/front/e/0/e0f98246-3913-4245-b404-f520b7305986.jpg', // Ugin, the Ineffable
    ],
    primaryColor: '#94a3b8', // Grey/Slate
    avatars: [
      { id: 'karn', name: 'Karn', color: '#94a3b8', imageUrl: 'https://cards.scryfall.io/art_crop/front/0/5/0500e58f-0c99-43db-98c2-27450779946e.jpg' },
      { id: 'ugin', name: 'Ugin', color: '#94a3b8', imageUrl: 'https://cards.scryfall.io/art_crop/front/e/0/e0f98246-3913-4245-b404-f520b7305986.jpg' },
      { id: 'tezzeret', name: 'Tezzeret', color: '#94a3b8', imageUrl: 'https://cards.scryfall.io/art_crop/front/5/8/58265203-bc16-43d2-99d4-d6a80fa6ca85.jpg' },
    ]
  },
  {
    id: 'land',
    nameKey: 'colors.land',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/a/a/aaafb9bc-7cea-4624-a227-595544fa42b0.jpg?1590511888', // Wasteland
      'https://cards.scryfall.io/art_crop/front/5/8/5805f607-282e-4bfc-bb2d-93bb9ca87a80.jpg', // Wrenn and Six
      'https://cards.scryfall.io/art_crop/front/2/1/2130328e-5337-4340-bb59-3fc3b1477da4.jpg', // Lord Windgrace
    ],
    primaryColor: '#b45309', // Brown/Amber
    avatars: [
      { id: 'wrenn', name: 'Wrenn', color: '#b45309', imageUrl: 'https://cards.scryfall.io/art_crop/front/5/8/5805f607-282e-4bfc-bb2d-93bb9ca87a80.jpg' },
      { id: 'windgrace', name: 'Windgrace', color: '#b45309', imageUrl: 'https://cards.scryfall.io/art_crop/front/2/1/2130328e-5337-4340-bb59-3fc3b1477da4.jpg' },
    ]
  },
  {
    id: 'vintage',
    nameKey: 'themes.vintage',
    imageUrls: [
      'https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg?1614638838', // Black Lotus
      'https://cards.scryfall.io/art_crop/front/3/d/3d833fdb-147b-40b3-968b-597581267458.jpg', // Ancestral Recall
      'https://cards.scryfall.io/art_crop/front/9/9/9960714c-1e24-42b7-8762-b9150937a4e6.jpg', // Time Walk
    ],
    primaryColor: '#d946ef', // Pink/Fuchsia
    avatars: [
      { id: 'black-lotus', name: 'Black Lotus', color: '#d946ef', imageUrl: 'https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg' },
      { id: 'mox-pearl', name: 'Mox Pearl', color: '#d946ef', imageUrl: 'https://cards.scryfall.io/art_crop/front/e/d/edce8646-6085-4521-884b-017770b152d3.jpg' },
    ]
  }
];

export const ALL_AVATARS = BANNER_THEMES.flatMap(t => t.avatars);

export function getAvatarById(id: string) {
  return ALL_AVATARS.find(a => a.id === id) || ALL_AVATARS[0];
}
