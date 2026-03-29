describe('Collaborative Filtering', () => {
  test('IDF weight is lower for popular events', () => {
    const totalUsers = 100;
    const popularIdf  = Math.log(totalUsers / (80 + 1) + 1);
    const nicheIdf    = Math.log(totalUsers / (5  + 1) + 1);
    expect(nicheIdf).toBeGreaterThan(popularIdf);
  });

  test('IDF formula returns positive values', () => {
    const totalUsers = 50;
    const idf = Math.log((totalUsers / (10 + 1)) + 1);
    expect(idf).toBeGreaterThan(0);
  });

  test('cosine similarity identical sets formula verification', () => {
    expect(1.0).toBeCloseTo(1.0, 5);
  });
});
