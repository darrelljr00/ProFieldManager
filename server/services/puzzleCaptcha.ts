import { randomBytes } from 'crypto';

interface PuzzleChallenge {
  token: string;
  targetX: number;
  targetY: number;
  pieceWidth: number;
  pieceHeight: number;
  imageWidth: number;
  imageHeight: number;
  shapeType: number;
  createdAt: number;
  expiresAt: number;
}

const puzzleChallenges = new Map<string, PuzzleChallenge>();

const PUZZLE_CONFIG = {
  imageWidth: 280,
  imageHeight: 155,
  pieceWidth: 50,
  pieceHeight: 50,
  tolerance: 10,
  expirationMs: 60000,
};

const PUZZLE_PATTERNS = [
  { bg: '#2563eb', fg: '#1e40af', accent: '#60a5fa' },
  { bg: '#059669', fg: '#047857', accent: '#34d399' },
  { bg: '#dc2626', fg: '#b91c1c', accent: '#f87171' },
  { bg: '#7c3aed', fg: '#6d28d9', accent: '#a78bfa' },
  { bg: '#ea580c', fg: '#c2410c', accent: '#fb923c' },
  { bg: '#0891b2', fg: '#0e7490', accent: '#22d3ee' },
  { bg: '#db2777', fg: '#be185d', accent: '#f472b6' },
  { bg: '#4f46e5', fg: '#4338ca', accent: '#818cf8' },
];

type ShapeType = 'puzzle' | 'circle' | 'star' | 'hexagon' | 'diamond' | 'heart';
const SHAPE_TYPES: ShapeType[] = ['puzzle', 'circle', 'star', 'hexagon', 'diamond', 'heart'];

function generateRandomPattern(): { backgroundSvg: string; pattern: typeof PUZZLE_PATTERNS[0] } {
  const pattern = PUZZLE_PATTERNS[Math.floor(Math.random() * PUZZLE_PATTERNS.length)];
  const shapes: string[] = [];
  
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * PUZZLE_CONFIG.imageWidth;
    const y = Math.random() * PUZZLE_CONFIG.imageHeight;
    const size = 10 + Math.random() * 30;
    const shapeType = Math.floor(Math.random() * 3);
    
    if (shapeType === 0) {
      shapes.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="${pattern.accent}" opacity="0.3"/>`);
    } else if (shapeType === 1) {
      shapes.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${pattern.accent}" opacity="0.25" transform="rotate(${Math.random() * 45}, ${x}, ${y})"/>`);
    } else {
      const points = `${x},${y - size} ${x - size},${y + size} ${x + size},${y + size}`;
      shapes.push(`<polygon points="${points}" fill="${pattern.accent}" opacity="0.2"/>`);
    }
  }
  
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * PUZZLE_CONFIG.imageWidth;
    const y1 = Math.random() * PUZZLE_CONFIG.imageHeight;
    const x2 = Math.random() * PUZZLE_CONFIG.imageWidth;
    const y2 = Math.random() * PUZZLE_CONFIG.imageHeight;
    shapes.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${pattern.fg}" stroke-width="2" opacity="0.3"/>`);
  }
  
  const backgroundSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PUZZLE_CONFIG.imageWidth}" height="${PUZZLE_CONFIG.imageHeight}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${pattern.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${pattern.fg};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>
      ${shapes.join('\n')}
    </svg>
  `;
  
  return { backgroundSvg, pattern };
}

function generateShapePath(x: number, y: number, w: number, h: number, shapeType: ShapeType): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  
  switch (shapeType) {
    case 'circle':
      return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;
    
    case 'star': {
      const points: string[] = [];
      const outerR = r;
      const innerR = r * 0.4;
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI / 5) - Math.PI / 2;
        const radius = i % 2 === 0 ? outerR : innerR;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
      }
      return points.join(' ') + ' Z';
    }
    
    case 'hexagon': {
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
      }
      return points.join(' ') + ' Z';
    }
    
    case 'diamond':
      return `M ${cx} ${y} L ${x + w} ${cy} L ${cx} ${y + h} L ${x} ${cy} Z`;
    
    case 'heart': {
      const scale = r / 25;
      return `M ${cx} ${cy + 15 * scale}
        C ${cx - 25 * scale} ${cy - 5 * scale}, ${cx - 25 * scale} ${cy - 25 * scale}, ${cx} ${cy - 15 * scale}
        C ${cx + 25 * scale} ${cy - 25 * scale}, ${cx + 25 * scale} ${cy - 5 * scale}, ${cx} ${cy + 15 * scale} Z`;
    }
    
    case 'puzzle':
    default: {
      const knobSize = 8;
      return `
        M ${x} ${y}
        L ${x + w * 0.4} ${y}
        C ${x + w * 0.4} ${y - knobSize}, ${x + w * 0.6} ${y - knobSize}, ${x + w * 0.6} ${y}
        L ${x + w} ${y}
        L ${x + w} ${y + h * 0.4}
        C ${x + w + knobSize} ${y + h * 0.4}, ${x + w + knobSize} ${y + h * 0.6}, ${x + w} ${y + h * 0.6}
        L ${x + w} ${y + h}
        L ${x + w * 0.6} ${y + h}
        C ${x + w * 0.6} ${y + h + knobSize}, ${x + w * 0.4} ${y + h + knobSize}, ${x + w * 0.4} ${y + h}
        L ${x} ${y + h}
        L ${x} ${y + h * 0.6}
        C ${x - knobSize} ${y + h * 0.6}, ${x - knobSize} ${y + h * 0.4}, ${x} ${y + h * 0.4}
        Z
      `;
    }
  }
}

export function generatePuzzleChallenge(): {
  token: string;
  backgroundImage: string;
  puzzlePiece: string;
  pieceY: number;
  imageWidth: number;
  imageHeight: number;
  pieceWidth: number;
  pieceHeight: number;
} {
  cleanupExpiredChallenges();
  
  const token = randomBytes(32).toString('hex');
  const shapeTypeIndex = Math.floor(Math.random() * SHAPE_TYPES.length);
  const shapeType = SHAPE_TYPES[shapeTypeIndex];
  
  const margin = PUZZLE_CONFIG.pieceWidth + 10;
  const targetX = margin + Math.floor(Math.random() * (PUZZLE_CONFIG.imageWidth - 2 * margin));
  const targetY = 10 + Math.floor(Math.random() * (PUZZLE_CONFIG.imageHeight - PUZZLE_CONFIG.pieceHeight - 20));
  
  const { backgroundSvg, pattern } = generateRandomPattern();
  
  const holePath = generateShapePath(targetX, targetY, PUZZLE_CONFIG.pieceWidth, PUZZLE_CONFIG.pieceHeight, shapeType);
  
  const backgroundWithHole = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PUZZLE_CONFIG.imageWidth}" height="${PUZZLE_CONFIG.imageHeight}">
      <defs>
        <mask id="holeMask">
          <rect width="100%" height="100%" fill="white"/>
          <path d="${holePath}" fill="black"/>
        </mask>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${pattern.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${pattern.fg};stop-opacity:1" />
        </linearGradient>
      </defs>
      <g mask="url(#holeMask)">
        ${backgroundSvg.replace(/<\/?svg[^>]*>/g, '')}
      </g>
      <path d="${holePath}" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="2"/>
      <path d="${holePath}" fill="rgba(0,0,0,0.15)"/>
    </svg>
  `;
  
  const piecePath = generateShapePath(0, 0, PUZZLE_CONFIG.pieceWidth, PUZZLE_CONFIG.pieceHeight, shapeType);
  const puzzlePiece = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PUZZLE_CONFIG.pieceWidth + 20}" height="${PUZZLE_CONFIG.pieceHeight + 20}" viewBox="-10 -10 ${PUZZLE_CONFIG.pieceWidth + 20} ${PUZZLE_CONFIG.pieceHeight + 20}">
      <defs>
        <clipPath id="pieceClip">
          <path d="${piecePath}"/>
        </clipPath>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
        <linearGradient id="pieceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${pattern.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${pattern.fg};stop-opacity:1" />
        </linearGradient>
      </defs>
      <g filter="url(#shadow)">
        <g clip-path="url(#pieceClip)">
          <rect x="-10" y="-10" width="${PUZZLE_CONFIG.pieceWidth + 20}" height="${PUZZLE_CONFIG.pieceHeight + 20}" fill="url(#pieceGrad)"/>
          <circle cx="${PUZZLE_CONFIG.pieceWidth * 0.3}" cy="${PUZZLE_CONFIG.pieceHeight * 0.3}" r="12" fill="${pattern.accent}" opacity="0.5"/>
          <circle cx="${PUZZLE_CONFIG.pieceWidth * 0.7}" cy="${PUZZLE_CONFIG.pieceHeight * 0.7}" r="8" fill="${pattern.accent}" opacity="0.4"/>
        </g>
        <path d="${piecePath}" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      </g>
    </svg>
  `;
  
  const challenge: PuzzleChallenge = {
    token,
    targetX,
    targetY,
    pieceWidth: PUZZLE_CONFIG.pieceWidth,
    pieceHeight: PUZZLE_CONFIG.pieceHeight,
    imageWidth: PUZZLE_CONFIG.imageWidth,
    imageHeight: PUZZLE_CONFIG.imageHeight,
    shapeType: shapeTypeIndex,
    createdAt: Date.now(),
    expiresAt: Date.now() + PUZZLE_CONFIG.expirationMs,
  };
  
  puzzleChallenges.set(token, challenge);
  
  const backgroundBase64 = Buffer.from(backgroundWithHole).toString('base64');
  const pieceBase64 = Buffer.from(puzzlePiece).toString('base64');
  
  return {
    token,
    backgroundImage: `data:image/svg+xml;base64,${backgroundBase64}`,
    puzzlePiece: `data:image/svg+xml;base64,${pieceBase64}`,
    pieceY: targetY,
    imageWidth: PUZZLE_CONFIG.imageWidth,
    imageHeight: PUZZLE_CONFIG.imageHeight,
    pieceWidth: PUZZLE_CONFIG.pieceWidth,
    pieceHeight: PUZZLE_CONFIG.pieceHeight,
  };
}

export function validatePuzzleSolution(token: string, submittedX: number): { 
  valid: boolean; 
  message: string;
} {
  const challenge = puzzleChallenges.get(token);
  
  if (!challenge) {
    return { valid: false, message: 'Invalid or expired captcha. Please try again.' };
  }
  
  if (Date.now() > challenge.expiresAt) {
    puzzleChallenges.delete(token);
    return { valid: false, message: 'Captcha has expired. Please try again.' };
  }
  
  puzzleChallenges.delete(token);
  
  const difference = Math.abs(challenge.targetX - submittedX);
  const isValid = difference <= PUZZLE_CONFIG.tolerance;
  
  console.log(`Captcha validation: targetX=${challenge.targetX}, submittedX=${submittedX}, diff=${difference}, tolerance=${PUZZLE_CONFIG.tolerance}, valid=${isValid}`);
  
  if (isValid) {
    return { valid: true, message: 'Verification successful!' };
  } else {
    return { valid: false, message: 'Verification failed. Please try again.' };
  }
}

function cleanupExpiredChallenges(): void {
  const now = Date.now();
  Array.from(puzzleChallenges.entries()).forEach(([token, challenge]) => {
    if (now > challenge.expiresAt) {
      puzzleChallenges.delete(token);
    }
  });
}

setInterval(cleanupExpiredChallenges, 60000);

export function getChallengeCount(): number {
  return puzzleChallenges.size;
}
