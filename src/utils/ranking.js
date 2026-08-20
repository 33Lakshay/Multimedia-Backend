const scoreFile = (file, query) => {
  const q = query.trim().toLowerCase();
  let relevance = 0;

  if (q) {
    const name = file.name.toLowerCase();
    if (name === q) relevance += 5;
    else if (name.startsWith(q)) relevance += 3;
    else if (name.includes(q)) relevance += 2;

    if (file.tags.some((tag) => tag === q)) relevance += 3;
    else if (file.tags.some((tag) => tag.includes(q))) relevance += 1.5;
  }

  const popularity = Math.log2((file.viewCount || 0) + 1);

  const ageInDays = (Date.now() - new Date(file.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const recency = Math.max(0, 3 - Math.log2(ageInDays + 1));

  return relevance * 2 + popularity + recency;
};

const rankFiles = (files, query) => {
  return [...files]
    .map((file) => ({ file, score: scoreFile(file, query) }))
    .sort((a, b) => b.score - a.score)
    .map(({ file, score }) => ({ ...file.toObject(), relevanceScore: Number(score.toFixed(2)) }));
};

module.exports = { scoreFile, rankFiles };
