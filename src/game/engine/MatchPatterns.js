const toSwapIndices = (swap) => {
  const indices = [];
  if (swap && typeof swap.aIndex === 'number') {
    indices.push(swap.aIndex);
  }
  if (swap && typeof swap.bIndex === 'number') {
    indices.push(swap.bIndex);
  }
  return indices;
};

const uniqueIndices = (a, b) => {
  const combined = [...a, ...b];
  return Array.from(new Set(combined));
};

const findCrossCandidate = (matches, swapIndices) => {
  const horizontals = matches.filter((match) => match.orientation === 'horizontal');
  const verticals = matches.filter((match) => match.orientation === 'vertical');
  const candidates = [];

  horizontals.forEach((hMatch) => {
    verticals.forEach((vMatch) => {
      if (hMatch.type !== vMatch.type) {
        return;
      }

      const overlap = hMatch.indices.find((index) => vMatch.indices.includes(index));
      if (overlap == null) {
        return;
      }

      const indices = uniqueIndices(hMatch.indices, vMatch.indices);
      if (indices.length < 5) {
        // Need at least 5 gems to form a cross/T shape (3 + 3 sharing one)
        return;
      }

      const centerIsSwap = swapIndices.includes(overlap);
      const includesSwap = swapIndices.some((index) => indices.includes(index));

      candidates.push({
        centerIndex: overlap,
        indices,
        centerIsSwap,
        includesSwap,
        weight: indices.length,
      });
    });
  });

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.centerIsSwap !== b.centerIsSwap) {
      return b.centerIsSwap - a.centerIsSwap;
    }
    if (a.includesSwap !== b.includesSwap) {
      return b.includesSwap - a.includesSwap;
    }
    return b.weight - a.weight;
  });

  return candidates[0];
};

const determineSwapIndex = (match, swapIndices) => {
  const candidate = swapIndices.find((index) => match.indices.includes(index));
  if (candidate != null) {
    return candidate;
  }

  // Fallback to middle of the match
  return match.indices[Math.floor(match.indices.length / 2)];
};

const findLineCandidates = (matches, swapIndices) => {
  const lines = matches.filter(
    (match) =>
      (match.orientation === 'horizontal' || match.orientation === 'vertical') &&
      match.indices.length >= 4,
  );
  if (!lines.length) {
    return [];
  }

  return lines.map(line => ({
    match: line,
    swapIndex: determineSwapIndex(line, swapIndices),
  }));
};

export const detectBonusFromMatches = (matches, { swap } = {}) => {
  const normalMatches = matches.filter((match) => match.type !== 'bonus-activation');
  if (!normalMatches.length) {
    return [];
  }

  const bonuses = [];
  const swapIndices = toSwapIndices(swap);

  const crossCandidate = findCrossCandidate(normalMatches, swapIndices);
  if (crossCandidate) {
    bonuses.push({
      type: 'cross',
      index: crossCandidate.centerIndex,
    });
  }

  const lineCandidates = findLineCandidates(normalMatches, swapIndices);
  lineCandidates.forEach(lineCandidate => {
    const lineLength = lineCandidate.match.indices.length;
    if (lineLength >= 5) {
      bonuses.push({ type: 'rainbow', index: lineCandidate.swapIndex });
    } else if (lineLength === 4) {
      bonuses.push({ type: 'bomb', index: lineCandidate.swapIndex });
    }
  });


  return bonuses;
};
