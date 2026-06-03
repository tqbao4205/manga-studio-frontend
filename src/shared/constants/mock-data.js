function pagePlaceholder(pageNum) {
  const colors = ['#e8f4f8', '#f8e8e8', '#f0f8e8', '#f8f0e8', '#e8e8f8']
  const bg = colors[pageNum % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="600" viewBox="0 0 420 600">
    <rect width="420" height="600" fill="${bg}"/>
    <rect x="20" y="20" width="380" height="560" fill="none" stroke="#ccc" stroke-width="2"/>
    <text x="210" y="290" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#bbb" font-weight="bold">Page ${pageNum}</text>
    <text x="210" y="330" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#ccc">Manga Page</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

export const mockUsers = [
  { id: 1, email: 'ichikawa@manga.com', username: 'ichikawa', displayName: 'Ichikawa', role: 'MANGAKA', avatarUrl: '', bio: 'Mangaka chuyên thể loại action fantasy.', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z' },
  { id: 2, email: 'tanaka@manga.com', username: 'tanaka', displayName: 'Tanaka', role: 'ASSISTANT', avatarUrl: '', bio: 'Background artist.', status: 'ACTIVE', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2026-04-15T00:00:00Z' },
  { id: 3, email: 'suzuki@manga.com', username: 'suzuki', displayName: 'Suzuki', role: 'ASSISTANT', avatarUrl: '', bio: 'Character inking specialist.', status: 'ACTIVE', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2026-04-10T00:00:00Z' },
  { id: 4, email: 'yamamoto@manga.com', username: 'yamamoto', displayName: 'Yamamoto', role: 'ASSISTANT', avatarUrl: '', bio: 'Text and effects.', status: 'ACTIVE', createdAt: '2024-03-15T00:00:00Z', updatedAt: '2026-04-12T00:00:00Z' },
  { id: 5, email: 'sato@editor.com', username: 'sato_editor', displayName: 'Sato', role: 'TANTOU_EDITOR', avatarUrl: '', bio: 'Editor phụ trách mảng shonen.', status: 'ACTIVE', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2026-05-10T00:00:00Z' },
  { id: 6, email: 'taniguchi@editor.com', username: 'taniguchi', displayName: 'Taniguchi', role: 'TANTOU_EDITOR', avatarUrl: '', bio: 'Editor phụ trách mảng shojo/seinen.', status: 'ACTIVE', createdAt: '2024-02-10T00:00:00Z', updatedAt: '2026-05-05T00:00:00Z' },
  { id: 7, email: 'kimura@board.com', username: 'kimura', displayName: 'Kimura', role: 'EDITORIAL_BOARD', avatarUrl: '', bio: 'Trưởng ban biên tập.', status: 'ACTIVE', createdAt: '2023-06-01T00:00:00Z', updatedAt: '2026-05-18T00:00:00Z' },
  { id: 8, email: 'nishida@board.com', username: 'nishida', displayName: 'Nishida', role: 'EDITORIAL_BOARD', avatarUrl: '', bio: 'Phó ban biên tập.', status: 'ACTIVE', createdAt: '2023-08-01T00:00:00Z', updatedAt: '2026-05-18T00:00:00Z' },
  { id: 9, email: 'fujimoto@manga.com', username: 'fujimoto', displayName: 'Fujimoto', role: 'MANGAKA', avatarUrl: '', bio: 'Tác giả shojo và seinen.', status: 'ACTIVE', createdAt: '2024-04-01T00:00:00Z', updatedAt: '2026-04-20T00:00:00Z' },
  { id: 10, email: 'ito@manga.com', username: 'ito', displayName: 'Ito', role: 'MANGAKA', avatarUrl: '', bio: 'Tác giả comedy nổi tiếng.', status: 'ACTIVE', createdAt: '2024-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z' },
]

export const mockSeries = [
  {
    id: 1, title: 'Blade of the Demon Moon', titleJp: '魔月の刃',
    synopsis: 'In an era where demons roam the land, a young swordsman named Kenji embarks on a journey to master the legendary Moon Blade and defeat the Demon King who slaughtered his clan.',
    genre: 'ACTION', targetDemographic: 'SHONEN', status: 'PUBLISHED',
    coverImageUrl: '', coverColor: '#e63946',
    mangakaId: 1, tantouEditorId: 5,
    publishFrequency: 'WEEKLY',
    chapterCount: 24, startDate: '2025-02-01T00:00:00Z',
    createdAt: '2025-01-15T10:00:00Z',
    rating: 4.9, tier: 'Pro Tier',
  },
  {
    id: 2, title: 'Shadow Monarch', titleJp: '影の君主',
    synopsis: 'A college student discovers he can command shadows. As he rises through the ranks of hunters, he uncovers a conspiracy that threatens the balance between worlds.',
    genre: 'FANTASY', targetDemographic: 'SHONEN', status: 'PUBLISHED',
    coverImageUrl: '', coverColor: '#7c4dff',
    mangakaId: 1, tantouEditorId: 5,
    publishFrequency: 'WEEKLY',
    chapterCount: 52, startDate: '2024-07-01T00:00:00Z',
    createdAt: '2024-06-01T10:00:00Z',
    rating: 4.7, tier: 'Pro Tier',
  },
  {
    id: 3, title: 'Cherry Blossoms After Winter', titleJp: '冬の桜',
    synopsis: 'Two childhood friends navigate the complexities of love and ambition as they pursue their dreams in Tokyo\'s competitive art scene.',
    genre: 'ROMANCE', targetDemographic: 'SHOJO', status: 'CANCELLED',
    coverImageUrl: '', coverColor: '#f472b6',
    mangakaId: 9, tantouEditorId: 6,
    publishFrequency: 'MONTHLY',
    chapterCount: 12, startDate: '2025-04-01T00:00:00Z',
    createdAt: '2025-03-10T10:00:00Z',
    rating: 4.8, tier: 'Pro Tier',
  },
  {
    id: 4, title: 'Iron Chef Reborn', titleJp: '鉄の料理人',
    synopsis: 'A former Michelin-star chef loses everything and must fight his way back to the top through underground cooking battles.',
    genre: 'COMEDY', targetDemographic: 'SEINEN', status: 'PUBLISHED',
    coverImageUrl: '', coverColor: '#f4a261',
    mangakaId: 10, tantouEditorId: 6,
    publishFrequency: 'BIWEEKLY',
    chapterCount: 8, startDate: '2025-07-01T00:00:00Z',
    createdAt: '2025-06-01T10:00:00Z',
    rating: 4.5, tier: 'Free Tier',
  },
  {
    id: 5, title: 'Neon Reaper', titleJp: 'ネオン死神',
    synopsis: 'In a cyberpunk Tokyo, a bounty hunter with a mysterious past takes on the most dangerous contracts while searching for her lost sister.',
    genre: 'ACTION', targetDemographic: 'SEINEN', status: 'PUBLISHED',
    coverImageUrl: '', coverColor: '#4fc3f7',
    mangakaId: 9, tantouEditorId: 5,
    publishFrequency: 'WEEKLY',
    chapterCount: 18, startDate: '2025-03-01T00:00:00Z',
    createdAt: '2025-02-15T10:00:00Z',
    rating: 4.6, tier: 'Pro Tier',
  },
  {
    id: 6, title: 'The Last Summoner', titleJp: '最後の召喚士',
    synopsis: 'The last surviving summoner must rebuild the ancient order while evading those who seek to eliminate all magic from the world.',
    genre: 'FANTASY', targetDemographic: 'SHONEN', status: 'DRAFT',
    coverImageUrl: '', coverColor: '#2a9d8f',
    mangakaId: 10, tantouEditorId: null,
    publishFrequency: null,
    chapterCount: 0, startDate: null,
    createdAt: '2026-05-10T10:00:00Z',
    rating: 0, tier: 'Free Tier',
  },
  {
    id: 7, title: 'Echoes of Eternity', titleJp: '永遠のこだま',
    synopsis: 'A time-traveling historian discovers that history is not what it seems. Each era holds a secret that could unravel the fabric of reality itself.',
    genre: 'FANTASY', targetDemographic: 'SEINEN', status: 'DRAFT',
    coverImageUrl: '', coverColor: '#264653',
    mangakaId: 1, tantouEditorId: null,
    publishFrequency: null,
    chapterCount: 0, startDate: null,
    createdAt: '2026-05-18T10:00:00Z',
    rating: 0, tier: 'Free Tier',
  },
  {
    id: 8, title: 'Stardust Warriors', titleJp: '星屑戦士',
    synopsis: 'A team of young pilots must defend Earth from an alien invasion using ancient mecha powered by stardust.',
    genre: 'ACTION', targetDemographic: 'SHONEN', status: 'IN_REVIEW',
    coverImageUrl: '', coverColor: '#e76f51',
    mangakaId: 9, tantouEditorId: 6,
    publishFrequency: 'WEEKLY',
    chapterCount: 0, startDate: null,
    createdAt: '2026-05-20T10:00:00Z',
    rating: 0, tier: 'Free Tier',
  },
  {
    id: 9, title: 'Love in Parallel', titleJp: 'パラレルラブ',
    synopsis: 'A scientist discovers alternate universes where different versions of her soulmate exist, forcing her to choose between realities.',
    genre: 'ROMANCE', targetDemographic: 'SHOJO', status: 'APPROVED',
    coverImageUrl: '', coverColor: '#f72585',
    mangakaId: 10, tantouEditorId: 6,
    publishFrequency: 'MONTHLY',
    chapterCount: 0, startDate: null,
    createdAt: '2026-05-22T10:00:00Z',
    rating: 0, tier: 'Free Tier',
  },
]

export const mockChapters = {
  1: [
    { id: 1, seriesId: 1, chapterNumber: 23, title: 'Crimson Resolve', pageCount: 20, status: 'IN_REVIEW', deadline: '2026-05-25', publishDate: null, progressPercent: 85, createdAt: '2026-04-01' },
    { id: 2, seriesId: 1, chapterNumber: 24, title: 'Moonlight Pursuit', pageCount: 22, status: 'IN_PROGRESS', deadline: '2026-06-10', publishDate: null, progressPercent: 45, createdAt: '2026-04-20' },
    { id: 3, seriesId: 1, chapterNumber: 25, title: 'The Final Confrontation', pageCount: 24, status: 'PLANNED', deadline: '2026-06-30', publishDate: null, progressPercent: 0, createdAt: '2026-05-01' },
  ],
  2: [
    { id: 4, seriesId: 2, chapterNumber: 51, title: 'Shadow Army', pageCount: 20, status: 'PUBLISHED', deadline: null, publishDate: '2026-05-15', progressPercent: 100, createdAt: '2026-03-01' },
    { id: 5, seriesId: 2, chapterNumber: 52, title: 'The Awakening', pageCount: 20, status: 'APPROVED', deadline: null, publishDate: null, progressPercent: 100, createdAt: '2026-04-01' },
    { id: 6, seriesId: 2, chapterNumber: 53, title: 'New World Order', pageCount: 22, status: 'IN_PROGRESS', deadline: '2026-06-05', publishDate: null, progressPercent: 30, createdAt: '2026-05-01' },
  ],
  4: [
    { id: 7, seriesId: 4, chapterNumber: 7, title: 'The Ultimate Ingredient', pageCount: 18, status: 'PENDING_BOARD_APPROVAL', deadline: '2026-05-28', publishDate: null, progressPercent: 90, createdAt: '2026-04-15' },
    { id: 8, seriesId: 4, chapterNumber: 8, title: 'Judge\'s Verdict', pageCount: 20, status: 'IN_PROGRESS', deadline: '2026-06-15', publishDate: null, progressPercent: 25, createdAt: '2026-05-05' },
  ],
}

export const mockPages = {
  1: Array.from({ length: 20 }, (_, i) => ({
    id: 100 + i, chapterId: 1, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1), finalImageUrl: '',
    width: 4200, height: 6000, status: i < 17 ? 'IN_PRODUCTION' : 'COMPLETED',
    regionCount: Math.floor(Math.random() * 5) + 1, createdAt: '2026-04-10',
  })),
  2: Array.from({ length: 22 }, (_, i) => ({
    id: 200 + i, chapterId: 2, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1), finalImageUrl: '',
    width: 4200, height: 6000, status: i < 10 ? 'UPLOADED' : (i < 18 ? 'REGIONS_DEFINED' : 'IN_PRODUCTION'),
    regionCount: i < 10 ? 0 : Math.floor(Math.random() * 3) + 1, createdAt: '2026-04-25',
  })),
  6: Array.from({ length: 20 }, (_, i) => ({
    id: 600 + i, chapterId: 6, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1), finalImageUrl: '',
    width: 4200, height: 6000, status: 'IN_PRODUCTION',
    regionCount: Math.floor(Math.random() * 3) + 1, createdAt: '2026-05-10',
  })),
  7: Array.from({ length: 16 }, (_, i) => ({
    id: 700 + i, chapterId: 7, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1), finalImageUrl: '',
    width: 4200, height: 6000, status: 'COMPLETED',
    regionCount: Math.floor(Math.random() * 4) + 1, createdAt: '2026-04-20',
  })),
  8: Array.from({ length: 18 }, (_, i) => ({
    id: 800 + i, chapterId: 8, pageNumber: i + 1,
    originalImageUrl: pagePlaceholder(i + 1), webImageUrl: pagePlaceholder(i + 1), finalImageUrl: '',
    width: 4200, height: 6000, status: i < 12 ? 'IN_PRODUCTION' : 'REGIONS_DEFINED',
    regionCount: i < 12 ? Math.floor(Math.random() * 3) + 1 : 0, createdAt: '2026-05-10',
  })),
}

export const mockRegions = {
  100: [
    { id: 500, pageId: 100, regionType: 'BACKGROUND', label: 'Castle background', x: 0, y: 0, width: 4200, height: 3000, color: '#4ECDC4', sortOrder: 1, createdAt: '2026-04-12' },
    { id: 501, pageId: 100, regionType: 'CHARACTER', label: 'Protagonist', x: 500, y: 800, width: 800, height: 1200, color: '#FF6B6B', sortOrder: 2, createdAt: '2026-04-12' },
    { id: 502, pageId: 100, regionType: 'TEXT', label: 'Speech bubble top', x: 100, y: 100, width: 600, height: 200, color: '#FFE66D', sortOrder: 3, createdAt: '2026-04-12' },
    { id: 503, pageId: 100, regionType: 'EFFECT', label: 'Speed lines', x: 1800, y: 2500, width: 1200, height: 800, color: '#A78BFA', sortOrder: 4, createdAt: '2026-04-12' },
  ],
  101: [
    { id: 510, pageId: 101, regionType: 'BACKGROUND', label: 'Forest background', x: 0, y: 0, width: 4200, height: 6000, color: '#4ECDC4', sortOrder: 1, createdAt: '2026-04-13' },
  ],
  200: [
    { id: 700, pageId: 200, regionType: 'BACKGROUND', label: 'Moonlit lake', x: 0, y: 0, width: 4200, height: 3000, color: '#4ECDC4', sortOrder: 1, createdAt: '2026-04-28' },
    { id: 701, pageId: 200, regionType: 'CHARACTER', label: 'Protagonist running', x: 500, y: 1500, width: 800, height: 1200, color: '#FF6B6B', sortOrder: 2, createdAt: '2026-04-28' },
  ],
  600: [
    { id: 800, pageId: 600, regionType: 'BACKGROUND', label: 'Shadow throne room', x: 0, y: 0, width: 4200, height: 6000, color: '#7c4dff', sortOrder: 1, createdAt: '2026-05-12' },
    { id: 801, pageId: 600, regionType: 'CHARACTER', label: 'Shadow Monarch', x: 500, y: 1000, width: 1000, height: 1500, color: '#FF6B6B', sortOrder: 2, createdAt: '2026-05-12' },
  ],
  700: [
    { id: 900, pageId: 700, regionType: 'BACKGROUND', label: 'Kitchen arena', x: 0, y: 0, width: 4200, height: 6000, color: '#f4a261', sortOrder: 1, createdAt: '2026-04-22' },
    { id: 901, pageId: 700, regionType: 'CHARACTER', label: 'Chef protagonist', x: 600, y: 800, width: 700, height: 1400, color: '#FF6B6B', sortOrder: 2, createdAt: '2026-04-22' },
  ],
  800: [
    { id: 1000, pageId: 800, regionType: 'BACKGROUND', label: 'Judge table', x: 0, y: 0, width: 4200, height: 3000, color: '#f4a261', sortOrder: 1, createdAt: '2026-05-12' },
    { id: 1001, pageId: 800, regionType: 'CHARACTER', label: 'Head judge', x: 300, y: 1200, width: 600, height: 1000, color: '#FF6B6B', sortOrder: 2, createdAt: '2026-05-12' },
  ],
}

export const mockTasks = [
  {
    id: 600, regionId: 500,
    title: 'Castle Background — Page 1',
    regionType: 'BACKGROUND',
    assistantId: 2, assignedBy: 1,
    status: 'DONE',
    priority: 'HIGH',
    dueDate: '2026-05-10',
    description: 'Draw the castle background for Page 1 — include towers, moat, and mountain backdrop. Use warm sunset lighting.',
    notes: 'Keep the castle style consistent with Chapter 20. Refer to design doc page 4 for color palette.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-04-12T00:00:00Z',
    createdAt: '2026-04-12',
  },
  {
    id: 601, regionId: 501,
    title: 'Protagonist Inking — Page 1',
    regionType: 'CHARACTER',
    assistantId: 3, assignedBy: 1,
    status: 'DONE',
    priority: 'HIGH',
    dueDate: '2026-05-12',
    description: 'Ink the main protagonist character on Page 1 — action pose with sword drawn, dynamic angle.',
    notes: 'Focus on face expression — determined look. Check reference sheet for armor details.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-04-12T00:00:00Z',
    createdAt: '2026-04-12',
  },
  {
    id: 602, regionId: 502,
    title: 'Speech Bubble — Top Panel',
    regionType: 'TEXT',
    assistantId: 4, assignedBy: 1,
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: '2026-05-20',
    description: 'Add speech bubbles and text for dialogue in the top panel — protagonist inner monologue about the demon moon.',
    notes: 'Use standard shonen bubble style. Japanese text with English translation underneath.',
    referenceImageUrl: '',
    pageImageUrl: '',
    assignedAt: '2026-04-12T00:00:00Z',
    createdAt: '2026-04-12',
  },
  {
    id: 610, regionId: 510,
    title: 'Forest Background — Page 2',
    regionType: 'BACKGROUND',
    assistantId: 2, assignedBy: 1,
    status: 'DONE',
    priority: 'URGENT',
    dueDate: '2026-05-15',
    description: 'Paint the forest background with trees and sunlight filtering through leaves. Misty morning atmosphere.',
    notes: 'Add depth with 3 layers: background trees (blur), mid trees (detail), foreground leaves (sharp).',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(2),
    assignedAt: '2026-04-13T00:00:00Z',
    createdAt: '2026-04-13',
  },
  {
    id: 700, regionId: 700,
    title: 'Moonlit Lake — Page 1 Ch.24',
    regionType: 'BACKGROUND',
    assistantId: 2, assignedBy: 1,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-05-30',
    description: 'Draw the moonlit lake background with reflection and misty mountains in the distance.',
    notes: 'Use cool blue tones. The moon should be 3/4 full and reflected on the water surface.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-04-28T00:00:00Z',
    createdAt: '2026-04-28',
  },
  {
    id: 800, regionId: 800,
    title: 'Shadow Throne Room — Page 1 Ch.53',
    regionType: 'BACKGROUND',
    assistantId: 2, assignedBy: 1,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-06-10',
    description: 'Draw the shadow throne room with dark pillars and a throne made of shadows. Purple/black color scheme.',
    notes: 'Refer to chapter 50 for throne design. Add floating shadow particles.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-05-12T00:00:00Z',
    createdAt: '2026-05-12',
  },
  {
    id: 801, regionId: 801,
    title: 'Shadow Monarch Character — Page 1 Ch.53',
    regionType: 'CHARACTER',
    assistantId: 4, assignedBy: 1,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '2026-06-15',
    description: 'Draw the Shadow Monarch standing in front of his throne. Full armor with flowing cape.',
    notes: 'Use reference sheet for armor details. Crown should have 7 spikes.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-05-12T00:00:00Z',
    createdAt: '2026-05-12',
  },
  {
    id: 900, regionId: 900,
    title: 'Kitchen Arena — Page 1 Ch.7',
    regionType: 'BACKGROUND',
    assistantId: 3, assignedBy: 10,
    status: 'DONE',
    priority: 'HIGH',
    dueDate: '2026-05-25',
    description: 'Draw the kitchen arena with cooking stations, audience seating, and dramatic overhead lighting.',
    notes: 'Use warm orange/yellow tones. Add steam and spark effects for drama.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-04-22T00:00:00Z',
    createdAt: '2026-04-22',
  },
  {
    id: 901, regionId: 901,
    title: 'Chef Protagonist — Page 1 Ch.7',
    regionType: 'CHARACTER',
    assistantId: 4, assignedBy: 10,
    status: 'DONE',
    priority: 'MEDIUM',
    dueDate: '2026-05-22',
    description: 'Draw the chef protagonist in action pose, holding a knife with dramatic flair. White chef coat, red headband.',
    notes: 'Emphasize the determined expression. Add motion lines around the knife.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-04-22T00:00:00Z',
    createdAt: '2026-04-22',
  },
  {
    id: 1000, regionId: 1000,
    title: 'Judge Table — Page 1 Ch.8',
    regionType: 'BACKGROUND',
    assistantId: 2, assignedBy: 10,
    status: 'TODO',
    priority: 'LOW',
    dueDate: '2026-06-20',
    description: 'Draw the judges table with three judges sitting behind it. Elegant setting with white tablecloth.',
    notes: 'Each judge should have a distinct appearance. Refer to character sheet.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-05-12T00:00:00Z',
    createdAt: '2026-05-12',
  },
  {
    id: 1001, regionId: 1001,
    title: 'Head Judge — Page 1 Ch.8',
    regionType: 'CHARACTER',
    assistantId: 3, assignedBy: 10,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '2026-06-22',
    description: 'Draw the head judge with a stern expression, holding a tasting spoon. Grey suit, glasses.',
    notes: 'Make him look authoritative. Grey hair, trimmed beard.',
    referenceImageUrl: '',
    pageImageUrl: pagePlaceholder(1),
    assignedAt: '2026-05-12T00:00:00Z',
    createdAt: '2026-05-12',
  },
]

export const mockTaskSubmissions = [
  { id: 700, taskId: 610, resultImageUrl: '', fileUrl: '', note: 'Completed forest background with all three depth layers.', version: 1, status: 'SUBMITTED', submittedAt: '2026-05-14T10:00:00Z' },
  { id: 901, taskId: 900, resultImageUrl: '', fileUrl: '', note: 'Kitchen arena v2 with lighting adjustments.', version: 2, status: 'APPROVED', submittedAt: '2026-05-23T14:00:00Z' },
  { id: 902, taskId: 901, resultImageUrl: '', fileUrl: '', note: 'Chef protagonist initial submission.', version: 1, status: 'APPROVED', submittedAt: '2026-05-20T11:00:00Z' },
]

export const mockTaskAttachments = [
  { id: 1, taskId: 600, fileUrl: '', uploadedAt: '2026-04-12T10:00:00Z' },
  { id: 2, taskId: 601, fileUrl: '', uploadedAt: '2026-04-12T10:00:00Z' },
]

export const mockLayers = {
  100: [
    { id: 1000, pageId: 100, label: 'Base Page', fileUrl: '', thumbnailUrl: '', sortOrder: 0, opacity: 1, visible: true, blendMode: 'normal', locked: false, createdBy: 1, createdAt: '2026-04-10' },
    { id: 1001, pageId: 100, label: 'Background - Tanaka', fileUrl: '', thumbnailUrl: '', sortOrder: 1, opacity: 1, visible: true, blendMode: 'normal', locked: false, createdBy: 2, createdAt: '2026-05-11' },
    { id: 1002, pageId: 100, label: 'Character - Suzuki', fileUrl: '', thumbnailUrl: '', sortOrder: 2, opacity: 0.85, visible: true, blendMode: 'multiply', locked: false, createdBy: 3, createdAt: '2026-05-13' },
  ],
  200: [
    { id: 2000, pageId: 200, label: 'Base Page', fileUrl: '', thumbnailUrl: '', sortOrder: 0, opacity: 1, visible: true, blendMode: 'normal', locked: false, createdBy: 1, createdAt: '2026-04-25' },
    { id: 2001, pageId: 200, label: 'Pencils', fileUrl: '', thumbnailUrl: '', sortOrder: 1, opacity: 0.7, visible: true, blendMode: 'multiply', locked: false, createdBy: 1, createdAt: '2026-04-28' },
  ],
}

export const mockComments = {
  100: [
    { id: 2000, pageId: 100, regionId: 500, content: 'The castle perspective is slightly off. Please adjust the right tower.', positionX: 2500, positionY: 500, createdBy: 5, status: 'RESOLVED', replyCount: 2, createdAt: '2026-04-15' },
    { id: 2001, pageId: 100, regionId: 501, content: 'Great expression work! Just make the eyes slightly larger for more impact.', positionX: 800, positionY: 1200, createdBy: 5, status: 'OPEN', replyCount: 0, createdAt: '2026-04-16' },
  ],
  200: [
    { id: 3000, pageId: 200, regionId: null, content: 'The moonlight reflection on the water needs more contrast.', positionX: 1500, positionY: 800, createdBy: 5, status: 'OPEN', replyCount: 1, createdAt: '2026-05-01' },
    { id: 3001, pageId: 200, regionId: null, content: 'Great dynamic pose on the protagonist!', positionX: 2000, positionY: 2500, createdBy: 5, status: 'OPEN', replyCount: 0, createdAt: '2026-05-02' },
  ],
}

export const mockAnnotations = {
  100: [
    { id: 1, pageId: 100, type: 'pen', x: 2500, y: 500, width: 100, height: 100, data: JSON.stringify({ points: [2500, 500, 2550, 480, 2600, 520], color: '#ff0000', strokeWidth: 3 }), createdBy: 5, createdAt: '2026-04-15' },
    { id: 2, pageId: 100, type: 'highlight', x: 800, y: 1200, width: 300, height: 200, data: JSON.stringify({ color: 'rgba(255, 255, 0, 0.3)' }), createdBy: 5, createdAt: '2026-04-16' },
  ],
  200: [
    { id: 3, pageId: 200, type: 'text-annotation', x: 1500, y: 800, width: 200, height: 100, data: JSON.stringify({ text: 'Add more contrast here', fontSize: 14 }), createdBy: 5, createdAt: '2026-05-01' },
  ],
}

export const mockNotifications = [
  { id: 1, userId: 1, type: 'TASK_SUBMITTED', title: 'New submission from Tanaka', message: 'Tanaka has submitted work for Background on Page 1.', referenceType: 'TASK', referenceId: 610, isRead: false, createdAt: '2026-05-14T10:30:00Z' },
  { id: 2, userId: 1, type: 'CHAPTER_SUBMITTED', title: 'Chapter 23 is in review', message: 'Chapter 23 "Crimson Resolve" has been submitted for editorial review.', referenceType: 'CHAPTER', referenceId: 1, isRead: false, createdAt: '2026-05-13T09:00:00Z' },
  { id: 3, userId: 1, type: 'RANKING_CHANGED', title: 'Blade of the Demon Moon has risen to #3', message: 'Your series has moved from #5 to #3 this period!', referenceType: 'SERIES', referenceId: 1, isRead: true, createdAt: '2026-05-12T15:00:00Z' },
  { id: 4, userId: 5, type: 'CHAPTER_SUBMITTED', title: 'Chapter 23 ready for review', message: 'Ichikawa has submitted Ch.23 "Crimson Resolve" for editorial review.', referenceType: 'CHAPTER', referenceId: 1, isRead: false, createdAt: '2026-05-13T09:01:00Z' },
  { id: 5, userId: 2, type: 'TASK_APPROVED', title: 'Your work was approved!', message: 'Ichikawa has approved your Background work on Page 1.', referenceType: 'TASK', referenceId: 600, isRead: true, createdAt: '2026-05-11T14:00:00Z' },
]

export const mockActivities = [
  { id: 1, type: 'TASK_APPROVED', message: 'Approved Background work by Tanaka on Page 1', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-14T11:00:00Z' },
  { id: 2, type: 'SUBMISSION_RECEIVED', message: 'Received submission from Tanaka for Background region', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-14T10:30:00Z' },
  { id: 3, type: 'CHAPTER_SUBMITTED', message: 'Submitted Ch.23 for editorial review', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-13T09:00:00Z' },
  { id: 4, type: 'COMMENT_RESOLVED', message: 'Resolved comment on Castle perspective', userId: 5, userName: 'Sato', createdAt: '2026-05-12T16:30:00Z' },
  { id: 5, type: 'RANKING_CHANGED', message: 'Shadow Monarch ranked #1 this period!', userId: 1, userName: 'Ichikawa', createdAt: '2026-05-12T15:00:00Z' },
  { id: 6, type: 'TASK_COMPLETED', message: 'Completed Character inking for Suzuki', userId: 3, userName: 'Suzuki', createdAt: '2026-05-11T17:00:00Z' },
]

export const mockRankings = [
  { id: 1, seriesId: 2, seriesTitle: 'Shadow Monarch', periodLabel: '2026-W20', rank: 1, tier: 'S', totalVotes: 15230, previousRank: 2, trend: 'UP', calculatedAt: '2026-05-18' },
  { id: 2, seriesId: 5, seriesTitle: 'Neon Reaper', periodLabel: '2026-W20', rank: 2, tier: 'S', totalVotes: 12450, previousRank: 3, trend: 'UP', calculatedAt: '2026-05-18' },
  { id: 3, seriesId: 1, seriesTitle: 'Blade of the Demon Moon', periodLabel: '2026-W20', rank: 3, tier: 'A', totalVotes: 10200, previousRank: 5, trend: 'UP', calculatedAt: '2026-05-18' },
  { id: 4, seriesId: 4, seriesTitle: 'Iron Chef Reborn', periodLabel: '2026-W20', rank: 7, tier: 'B', totalVotes: 6800, previousRank: 6, trend: 'DOWN', calculatedAt: '2026-05-18' },
  { id: 5, seriesId: 3, seriesTitle: 'Cherry Blossoms After Winter', periodLabel: '2026-W20', rank: 18, tier: 'C', totalVotes: 1200, previousRank: 15, trend: 'DOWN', calculatedAt: '2026-05-18' },
  { id: 6, seriesId: 6, seriesTitle: 'The Last Summoner', periodLabel: '2026-W20', rank: 25, tier: 'D', totalVotes: 450, previousRank: undefined, trend: 'NEW', calculatedAt: '2026-05-18' },
]

export const mockSchedules = [
  { id: 1, seriesId: 2, seriesTitle: 'Shadow Monarch', chapterId: 4, chapterNumber: 51, scheduledDate: '2026-05-15', periodLabel: '2026-W20', status: 'PUBLISHED', createdAt: '2026-04-20' },
  { id: 2, seriesId: 2, seriesTitle: 'Shadow Monarch', chapterId: 5, chapterNumber: 52, scheduledDate: '2026-05-22', periodLabel: '2026-W21', status: 'IN_PRESS', createdAt: '2026-04-27' },
  { id: 3, seriesId: 1, seriesTitle: 'Blade of the Demon Moon', chapterId: 1, chapterNumber: 23, scheduledDate: '2026-05-29', periodLabel: '2026-W22', status: 'SCHEDULED', createdAt: '2026-05-01' },
  { id: 4, seriesId: 5, seriesTitle: 'Neon Reaper', chapterId: undefined, chapterNumber: 19, scheduledDate: '2026-06-05', periodLabel: '2026-W23', status: 'SCHEDULED', createdAt: '2026-05-10' },
]

export const mockBoardVotes = [
  { id: 1, seriesId: 9, chapterId: null, boardMemberId: 7, vote: 'APPROVE', note: 'Great concept, approve for publication.', votedAt: '2026-05-23T10:00:00Z' },
  { id: 2, seriesId: 8, chapterId: null, boardMemberId: 8, vote: 'APPROVE', note: 'Strong market potential.', votedAt: '2026-05-22T14:00:00Z' },
]

export const mockDashboardStats = {
  1: {
    userId: 1,
    activeSeries: 3,
    ongoingChapters: 3,
    pendingTasks: 2,
    submissionsToReview: 1,
    currentRank: 3,
    rankTrend: 'UP',
  },
  5: {
    userId: 5,
    assignedSeries: 3,
    chaptersInReview: 2,
    pendingComments: 12,
  },
  7: {
    userId: 7,
    totalSeries: 7,
    pendingApprovals: 2,
    upcomingSchedules: 3,
    atRiskSeries: 1,
    lastPeriodVotes: 45200,
  },
  8: {
    userId: 8,
    totalSeries: 7,
    pendingApprovals: 2,
    upcomingSchedules: 3,
    atRiskSeries: 1,
    lastPeriodVotes: 45200,
  },
}

export function getMockUser(id) {
  return mockUsers.find(u => u.id === id)
}

export function seriesPlaceholder(title, color) {
  const initials = title.split(' ').map(w => w[0]).join('').slice(0, 3)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
    <rect width="200" height="280" fill="${color}"/>
    <rect x="10" y="10" width="180" height="260" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="100" y="130" text-anchor="middle" font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" font-weight="bold">${initials}</text>
    <text x="100" y="160" text-anchor="middle" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.5)">MANGA</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}
