'use client';

import Link from 'next/link';
import { ArrowRight, Play, Users, BarChart3, Clock, Upload, Zap, Target, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

function Header() {
  return (
    <header className="w-full relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-lg sm:text-xl font-bold text-white">AI Scout</span>
          </Link>

          {/* Navigation - desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#0f2d52] bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// Rotating text animation component
function RotatingText() {
  const words = ['Player', 'Coach', 'Team'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // "Player" is the longest word, so we use it to set fixed width
  return (
    <span
      className="inline-block relative overflow-hidden text-left"
      style={{ height: '1.3em', lineHeight: '1.3em', minWidth: '3.5em' }}
    >
      <span
        className={`block transition-all duration-300 ease-in-out ${
          isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
}

// Enhanced Dashboard data for Football and Basketball
const footballPlayers = [
  {
    id: 1,
    jersey: '7',
    position: 'QB',
    name: 'Marcus Johnson',
    height: "6'2\"",
    weight: 195,
    year: 'Junior',
    overallGrade: 84,
    grades: {
      armStrength: 87,
      accuracy: 83,
      decisionMaking: 81,
      pocketPresence: 79,
      athleticism: 88,
      leadership: 85,
    },
    advancedStats: {
      completions: 18,
      attempts: 27,
      compPct: 66.7,
      yards: 243,
      tds: 3,
      ints: 1,
      rating: 128.4,
      avgDepth: 8.2,
      timeToThrow: 2.3,
      pressureRate: 28.5,
      cleanPocketPct: 71.5,
      adjCompPct: 72.1,
    },
    analysis: {
      summary: "High-ceiling quarterback with prototypical size and arm talent. Shows excellent poise under pressure and ability to extend plays. Decision-making is advanced for his age, though occasional lapses in coverage recognition.",
      strengths: [
        "Elite arm strength - can make every NFL throw",
        "Excellent pocket mobility and escapability",
        "Strong pre-snap read ability, often checks to correct play",
        "Maintains accuracy on the move",
      ],
      improvements: [
        "Tends to lock onto first read on play-action",
        "Footwork inconsistent on deep outs",
        "Needs to speed up release against pressure",
      ],
      projection: "Projects as a Day 2 draft pick with starter upside. Needs refinement but has all the physical tools.",
    },
    keyMoments: [
      { time: '14:23', type: 'highlight', description: 'TD Pass - Back shoulder fade vs tight coverage', grade: 'A+', thumbnail: '🎯' },
      { time: '11:45', type: 'highlight', description: 'Scramble right, throws across body for 22 yards', grade: 'A', thumbnail: '🏃' },
      { time: '8:12', type: 'highlight', description: 'Reads blitz, hot route to RB for first down', grade: 'A', thumbnail: '🧠' },
      { time: '5:33', type: 'negative', description: 'Forced throw into double coverage - INT', grade: 'D', thumbnail: '⚠️' },
      { time: '2:15', type: 'highlight', description: 'Game-winning drive, 4/4 for 45 yards', grade: 'A+', thumbnail: '🏆' },
    ],
  },
  {
    id: 2,
    jersey: '23',
    position: 'RB',
    name: 'Darius Williams',
    height: "5'10\"",
    weight: 205,
    year: 'Senior',
    overallGrade: 79,
    grades: {
      vision: 82,
      burst: 85,
      power: 78,
      passProtection: 71,
      receiving: 76,
      durability: 80,
    },
    advancedStats: {
      carries: 18,
      rushYards: 94,
      ypc: 5.2,
      rushTds: 1,
      targets: 4,
      receptions: 3,
      recYards: 18,
      brokenTackles: 4,
      yardsAfterContact: 42,
      stuffRate: 11.1,
    },
    analysis: {
      summary: "Explosive runner with excellent burst through the hole. Patient enough to let blocks develop, then accelerates quickly. Pass protection remains a work in progress.",
      strengths: [
        "Elite acceleration and top-end speed",
        "Excellent vision - finds cutback lanes",
        "Finishes runs with power despite size",
      ],
      improvements: [
        "Pass protection technique needs work",
        "Ball security in traffic",
        "Route running is limited",
      ],
      projection: "Day 3 pick with potential as change-of-pace back. Special teams value.",
    },
    keyMoments: [
      { time: '12:05', type: 'highlight', description: '22 yard run - Great cutback vision', grade: 'A', thumbnail: '💨' },
      { time: '6:33', type: 'negative', description: 'Missed blitz pickup, QB hit', grade: 'C-', thumbnail: '⚠️' },
    ],
  },
  {
    id: 3,
    jersey: '88',
    position: 'WR',
    name: 'Tyler Adams',
    height: "6'1\"",
    weight: 185,
    year: 'Junior',
    overallGrade: 86,
    grades: {
      routeRunning: 89,
      separation: 84,
      catching: 88,
      yac: 82,
      blocking: 72,
      versatility: 80,
    },
    advancedStats: {
      targets: 9,
      receptions: 7,
      recYards: 94,
      ypr: 13.4,
      tds: 1,
      catchPct: 77.8,
      avgSeparation: 2.1,
      contestedCatchPct: 66.7,
      dropRate: 0,
      yardsPerRoute: 2.4,
    },
    analysis: {
      summary: "Polished route runner with natural hands. Creates consistent separation on intermediate routes. Shows excellent body control and concentration in contested situations.",
      strengths: [
        "Crisp route breaks - creates easy separation",
        "Reliable hands, zero drops this game",
        "Tracks ball well over shoulder",
      ],
      improvements: [
        "Add more physicality at catch point",
        "Run blocking effort inconsistent",
        "Deep speed is average",
      ],
      projection: "Projects as reliable possession receiver at next level. WR2 ceiling.",
    },
    keyMoments: [
      { time: '14:23', type: 'highlight', description: 'TD catch - Adjusted to back shoulder throw', grade: 'A+', thumbnail: '🎯' },
      { time: '9:17', type: 'highlight', description: 'Contested catch over CB for 18 yards', grade: 'A', thumbnail: '🙌' },
    ],
  },
  {
    id: 4,
    jersey: '12',
    position: 'WR',
    name: 'Chris Martinez',
    height: "5'11\"",
    weight: 175,
    year: 'Sophomore',
    overallGrade: 72,
    grades: {
      routeRunning: 74,
      separation: 70,
      catching: 68,
      yac: 75,
      blocking: 65,
      versatility: 72,
    },
    advancedStats: {
      targets: 5,
      receptions: 3,
      recYards: 31,
      ypr: 10.3,
      tds: 0,
      catchPct: 60.0,
      avgSeparation: 1.4,
      contestedCatchPct: 33.3,
      dropRate: 20.0,
      yardsPerRoute: 1.1,
    },
    analysis: {
      summary: "Young receiver still developing. Shows flashes of quickness but lacks consistency. The critical drop on 3rd down is a concentration issue that needs to be addressed.",
      strengths: [
        "Quick feet off the line",
        "Good speed in open field",
        "Competitive attitude",
      ],
      improvements: [
        "Focus and concentration on catches",
        "Route crispness at top of breaks",
        "Needs to play stronger",
      ],
      projection: "Developmental prospect. Could emerge with more reps and maturity.",
    },
    keyMoments: [
      { time: '5:42', type: 'negative', description: 'Drop on 3rd down conversion attempt', grade: 'D', thumbnail: '⚠️' },
    ],
  },
  {
    id: 5,
    jersey: '56',
    position: 'LT',
    name: 'Jake Thompson',
    height: "6'5\"",
    weight: 305,
    year: 'Senior',
    overallGrade: 81,
    grades: {
      passProtection: 83,
      runBlocking: 79,
      technique: 82,
      power: 80,
      athleticism: 77,
      awareness: 84,
    },
    advancedStats: {
      snaps: 68,
      pressuresAllowed: 2,
      sacksAllowed: 0,
      hitsAllowed: 1,
      hurriesAllowed: 1,
      pressureRate: 2.9,
      pancakes: 3,
      penalties: 1,
      runBlockGrade: 79.2,
      passBlockGrade: 83.1,
    },
    analysis: {
      summary: "Reliable pass protector with excellent anchor. Allowed zero sacks and handled speed rush well. Run blocking shows room for growth at the second level.",
      strengths: [
        "Excellent anchor against power",
        "Quick set against speed rush",
        "Communicates well with interior line",
      ],
      improvements: [
        "Struggles reaching second level",
        "Can get overextended on combo blocks",
        "Lateral movement needs work",
      ],
      projection: "NFL backup with potential to develop into starter. Reliable in protection.",
    },
    keyMoments: [
      { time: '11:20', type: 'highlight', description: 'Excellent pickup on twist stunt', grade: 'A', thumbnail: '🛡️' },
      { time: '7:55', type: 'highlight', description: 'Pancake block sprung TD run', grade: 'A+', thumbnail: '💪' },
    ],
  },
];

const basketballPlayers = [
  {
    id: 1,
    jersey: '3',
    position: 'PG',
    name: 'Jordan Mitchell',
    height: "6'1\"",
    weight: 180,
    year: 'Junior',
    overallGrade: 87,
    grades: {
      scoring: 82,
      playmaking: 91,
      defense: 78,
      athleticism: 84,
      bbiq: 89,
      leadership: 86,
    },
    advancedStats: {
      points: 18,
      assists: 8,
      rebounds: 4,
      steals: 2,
      turnovers: 2,
      fgPct: 47.1,
      threePct: 37.5,
      ftPct: 85.7,
      ast2to: 4.0,
      usgRate: 24.3,
      per: 22.8,
      ortg: 118,
    },
    analysis: {
      summary: "Elite floor general with exceptional court vision. Controls pace masterfully and creates high-quality looks for teammates. Shooting has improved but still streaky. Defensive effort inconsistent off-ball.",
      strengths: [
        "Elite court vision - sees plays before they develop",
        "Excellent PnR operator, makes right reads",
        "Clutch performer - raises game in big moments",
        "Vocal leader, commands respect",
      ],
      improvements: [
        "Off-ball defensive awareness",
        "Consistency from three-point range",
        "Can be turnover prone in traffic",
      ],
      projection: "First-round talent. Projects as starting PG at next level.",
    },
    keyMoments: [
      { time: 'Q2 4:32', type: 'highlight', description: 'Lob assist on PnR - Perfect timing and touch', grade: 'A+', thumbnail: '🎯' },
      { time: 'Q3 8:15', type: 'highlight', description: 'Step-back three in transition, dagger shot', grade: 'A', thumbnail: '🔥' },
      { time: 'Q4 2:05', type: 'negative', description: 'Lost assignment on backdoor cut - easy layup', grade: 'C', thumbnail: '⚠️' },
      { time: 'Q4 0:45', type: 'highlight', description: 'Game-sealing steal and finish', grade: 'A+', thumbnail: '🏆' },
    ],
  },
  {
    id: 2,
    jersey: '11',
    position: 'SG',
    name: 'Marcus Davis',
    height: "6'4\"",
    weight: 195,
    year: 'Senior',
    overallGrade: 83,
    grades: {
      scoring: 88,
      playmaking: 72,
      defense: 76,
      athleticism: 81,
      shooting: 89,
      offBall: 85,
    },
    advancedStats: {
      points: 22,
      assists: 2,
      rebounds: 3,
      steals: 1,
      turnovers: 1,
      fgPct: 52.9,
      threePct: 42.9,
      ftPct: 85.0,
      catchShootPct: 50.0,
      pullupPct: 33.3,
      spotUpPPP: 1.24,
    },
    analysis: {
      summary: "Knockdown shooter with quick release. Very effective in catch-and-shoot situations and coming off screens. Limited playmaking ability but knows his role.",
      strengths: [
        "Elite catch-and-shoot ability",
        "Quick release, hard to contest",
        "Excellent off-ball movement",
      ],
      improvements: [
        "Defensive close-out technique",
        "Creating own shot off dribble",
        "Rebounding effort",
      ],
      projection: "Role player at next level. Valuable 3&D potential.",
    },
    keyMoments: [
      { time: 'Q1 6:20', type: 'highlight', description: 'Corner three - Quick release over closeout', grade: 'A', thumbnail: '🎯' },
      { time: 'Q3 5:45', type: 'highlight', description: 'Pump fake, one dribble, finish at rim', grade: 'A', thumbnail: '🏀' },
    ],
  },
  {
    id: 3,
    jersey: '24',
    position: 'SF',
    name: 'Andre Williams',
    height: "6'7\"",
    weight: 215,
    year: 'Junior',
    overallGrade: 80,
    grades: {
      scoring: 75,
      playmaking: 74,
      defense: 86,
      athleticism: 88,
      versatility: 84,
      rebounding: 78,
    },
    advancedStats: {
      points: 12,
      assists: 3,
      rebounds: 7,
      steals: 3,
      blocks: 1,
      fgPct: 45.5,
      threePct: 28.6,
      defRtg: 98,
      stlPct: 3.2,
      drebPct: 18.4,
    },
    analysis: {
      summary: "Versatile two-way player who can guard 1-4. Elite length and athleticism. Offense is still developing but shows flashes.",
      strengths: [
        "Switchable defender - can guard multiple positions",
        "Active hands, disrupts passing lanes",
        "Elite transition player",
      ],
      improvements: [
        "Three-point consistency",
        "Half-court creation",
        "Free throw shooting",
      ],
      projection: "Defensive specialist at next level. 3&D upside if shot develops.",
    },
    keyMoments: [
      { time: 'Q2 1:15', type: 'highlight', description: 'Chase-down block in transition', grade: 'A+', thumbnail: '🚫' },
      { time: 'Q4 6:30', type: 'highlight', description: 'Switched onto PG, forced turnover', grade: 'A', thumbnail: '🔒' },
    ],
  },
  {
    id: 4,
    jersey: '32',
    position: 'PF',
    name: 'Kevin Brooks',
    height: "6'9\"",
    weight: 235,
    year: 'Senior',
    overallGrade: 77,
    grades: {
      scoring: 76,
      postGame: 79,
      defense: 74,
      rebounding: 82,
      athleticism: 73,
      bbiq: 78,
    },
    advancedStats: {
      points: 10,
      assists: 1,
      rebounds: 9,
      blocks: 2,
      fgPct: 55.6,
      postUpPPP: 0.92,
      orebPct: 12.1,
      drebPct: 22.3,
      boxPlusMinus: 3.2,
    },
    analysis: {
      summary: "Physical presence in the paint. Good rebounder with developing post moves. Limited range keeps him as a traditional big.",
      strengths: [
        "Physical post presence",
        "Excellent offensive rebounder",
        "Soft touch around rim",
      ],
      improvements: [
        "Extend range to three-point line",
        "Help-side defense rotations",
        "Conditioning and mobility",
      ],
      projection: "Backup big at next level. Energy and rebounding role.",
    },
    keyMoments: [
      { time: 'Q2 7:40', type: 'highlight', description: 'And-1 finish through contact', grade: 'A', thumbnail: '💪' },
    ],
  },
  {
    id: 5,
    jersey: '44',
    position: 'C',
    name: 'David Chen',
    height: "6'11\"",
    weight: 250,
    year: 'Sophomore',
    overallGrade: 75,
    grades: {
      scoring: 68,
      rimProtection: 82,
      rebounding: 78,
      screening: 80,
      athleticism: 65,
      footwork: 70,
    },
    advancedStats: {
      points: 8,
      assists: 2,
      rebounds: 11,
      blocks: 4,
      fgPct: 62.5,
      blkPct: 8.2,
      contestedShotPct: 42.1,
      screenAssists: 6,
      drebPct: 28.4,
    },
    analysis: {
      summary: "Rim protector with excellent timing on blocks. Sets solid screens. Limited mobility affects ability to defend in space.",
      strengths: [
        "Shot-blocking timing and instincts",
        "Solid screen setter",
        "Holds position in post",
      ],
      improvements: [
        "Lateral mobility on switches",
        "Offensive skill development",
        "Free throw shooting",
      ],
      projection: "Backup center role. Could develop into starter with improved mobility.",
    },
    keyMoments: [
      { time: 'Q3 3:20', type: 'highlight', description: 'Weak-side block on drive attempt', grade: 'A', thumbnail: '🚫' },
      { time: 'Q4 8:10', type: 'negative', description: 'Slow PnR rotation, gave up open three', grade: 'C-', thumbnail: '⚠️' },
    ],
  },
];

const footballDashboard = {
  sport: 'football',
  gameTitle: 'Game Analysis - Lincoln vs Jefferson',
  players: footballPlayers,
  accentColor: '#0f2d52',
};

const basketballDashboard = {
  sport: 'basketball',
  gameTitle: 'Game Analysis - Eagles vs Panthers',
  players: basketballPlayers,
  accentColor: '#c2410c',
};

// Enhanced Animated Dashboard component with tabs and clickable players
function AnimatedDashboard() {
  const [isFootball, setIsFootball] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'clips'>('overview');

  const dashboard = isFootball ? footballDashboard : basketballDashboard;
  const selectedPlayer = dashboard.players.find(p => p.id === selectedPlayerId) || dashboard.players[0];

  const switchSport = (toFootball: boolean) => {
    if (isFootball === toFootball) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIsFootball(toFootball);
      setSelectedPlayerId(1);
      setActiveTab('overview');
      setIsTransitioning(false);
    }, 200);
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600 bg-green-100';
    if (grade.startsWith('B')) return 'text-blue-600 bg-blue-100';
    if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getGradeBarColor = (grade: number) => {
    if (grade >= 85) return 'bg-green-500';
    if (grade >= 75) return 'bg-blue-500';
    if (grade >= 65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get grade entries as array for display
  const gradeEntries = Object.entries(selectedPlayer.grades).map(([key, value]) => ({
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    grade: value as number,
  }));

  // Get advanced stats as array
  const statsEntries = Object.entries(selectedPlayer.advancedStats).slice(0, 8).map(([key, value]) => ({
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Pct', '%'),
    value: typeof value === 'number' ? (key.includes('Pct') || key.includes('pct') ? `${value}%` : value) : value,
  }));

  return (
    <div className="relative p-2 sm:p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
      {/* Sport toggle tabs */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-white/10 rounded-lg p-1">
        <button
          onClick={() => switchSport(true)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ${isFootball ? 'bg-white text-[#0f2d52]' : 'text-white/70 hover:text-white'}`}
        >
          Football
        </button>
        <button
          onClick={() => switchSport(false)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ${!isFootball ? 'bg-orange-500 text-white' : 'text-white/70 hover:text-white'}`}
        >
          Basketball
        </button>
      </div>

      <div className={`aspect-[16/9] rounded-xl bg-white shadow-2xl overflow-hidden transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        <div className="h-full flex flex-col">
          {/* Top bar */}
          <div className="h-10 bg-gray-100 border-b flex items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${isFootball ? 'bg-[#0f2d52] text-white' : 'bg-orange-600 text-white'}`}>
                {isFootball ? 'FOOTBALL' : 'BASKETBALL'}
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">{dashboard.gameTitle}</span>
            </div>
            <div className="w-16" />
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Players with names */}
            <div className="w-48 lg:w-56 bg-gray-50 border-r hidden sm:flex flex-col">
              <div className="p-3 border-b">
                <div className="text-xs font-semibold text-gray-400">PLAYERS DETECTED</div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {dashboard.players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => { setSelectedPlayerId(player.id); setActiveTab('overview'); }}
                    className={`w-full text-left py-2 px-3 rounded-lg mb-1 transition-all ${
                      selectedPlayerId === player.id
                        ? `${isFootball ? 'bg-[#0f2d52]' : 'bg-orange-600'} shadow-lg`
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        selectedPlayerId === player.id
                          ? 'bg-white/20 text-white'
                          : `${isFootball ? 'bg-[#0f2d52]' : 'bg-orange-600'} text-white`
                      }`}>
                        {player.jersey}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${selectedPlayerId === player.id ? 'text-white' : 'text-gray-900'}`}>
                          {player.name}
                        </div>
                        <div className={`text-xs ${selectedPlayerId === player.id ? 'text-white/70' : 'text-gray-500'}`}>
                          {player.position} • {player.height}
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${selectedPlayerId === player.id ? 'text-white' : isFootball ? 'text-[#0f2d52]' : 'text-orange-600'}`}>
                        {player.overallGrade}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Player header with physical stats */}
              <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white ${isFootball ? 'bg-[#0f2d52]' : 'bg-orange-600'}`}>
                      #{selectedPlayer.jersey}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{selectedPlayer.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isFootball ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {selectedPlayer.position}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{selectedPlayer.height}</span>
                        <span className="text-gray-300">|</span>
                        <span>{selectedPlayer.weight} lbs</span>
                        <span className="text-gray-300">|</span>
                        <span>{selectedPlayer.year}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${isFootball ? 'text-[#0f2d52]' : 'text-orange-600'}`}>
                      {selectedPlayer.overallGrade}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">OVERALL GRADE</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b bg-white px-4">
                {[
                  { id: 'overview', label: 'AI Analysis' },
                  { id: 'stats', label: 'Advanced Stats' },
                  { id: 'clips', label: 'Video Clips' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? `${isFootball ? 'border-[#0f2d52] text-[#0f2d52]' : 'border-orange-600 text-orange-600'}`
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' && (
                  <div className="p-4 space-y-4">
                    {/* Skill Grades Row */}
                    <div className="grid grid-cols-6 gap-2">
                      {gradeEntries.map((item, i) => (
                        <div key={i} className="text-center">
                          <div className={`text-lg font-bold ${item.grade >= 80 ? 'text-green-600' : item.grade >= 70 ? 'text-blue-600' : 'text-yellow-600'}`}>
                            {item.grade}
                          </div>
                          <div className="text-[10px] text-gray-500 leading-tight">{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* AI Analysis - Summary */}
                    <div className={`rounded-xl p-4 ${isFootball ? 'bg-blue-50' : 'bg-orange-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isFootball ? 'bg-[#0f2d52]' : 'bg-orange-600'}`}>
                          <span className="text-white text-xs">AI</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Scout Summary</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedPlayer.analysis.summary}
                      </p>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 rounded-xl p-3">
                        <div className="text-xs font-semibold text-green-700 mb-2">STRENGTHS</div>
                        <ul className="space-y-1">
                          {selectedPlayer.analysis.strengths.slice(0, 3).map((s, i) => (
                            <li key={i} className="text-xs text-green-800 flex items-start gap-1">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span className="line-clamp-2">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3">
                        <div className="text-xs font-semibold text-amber-700 mb-2">DEVELOPMENT AREAS</div>
                        <ul className="space-y-1">
                          {selectedPlayer.analysis.improvements.slice(0, 3).map((s, i) => (
                            <li key={i} className="text-xs text-amber-800 flex items-start gap-1">
                              <span className="text-amber-500 mt-0.5">→</span>
                              <span className="line-clamp-2">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Projection */}
                    <div className="bg-gray-100 rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-1">PROJECTION</div>
                      <p className="text-sm text-gray-800">{selectedPlayer.analysis.projection}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="p-4 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {statsEntries.map((stat, i) => (
                        <div key={i} className={`rounded-lg p-3 text-center ${isFootball ? 'bg-blue-50' : 'bg-orange-50'}`}>
                          <div className={`text-xl font-bold ${isFootball ? 'text-[#0f2d52]' : 'text-orange-600'}`}>
                            {stat.value}
                          </div>
                          <div className="text-[10px] text-gray-600 leading-tight">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Skill Breakdown with bars */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-gray-600 mb-3">SKILL BREAKDOWN</div>
                      <div className="space-y-2">
                        {gradeEntries.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-24 text-xs text-gray-600 truncate">{item.label}</div>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getGradeBarColor(item.grade)}`}
                                style={{ width: `${item.grade}%` }}
                              />
                            </div>
                            <div className="w-8 text-xs font-semibold text-gray-700 text-right">{item.grade}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'clips' && (
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {selectedPlayer.keyMoments.map((moment, i) => (
                        <div
                          key={i}
                          className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                            moment.type === 'highlight' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}
                        >
                          {/* Video thumbnail area */}
                          <div className={`h-16 flex items-center justify-center ${moment.type === 'highlight' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <span className="text-3xl">{moment.thumbnail}</span>
                          </div>
                          <div className="p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isFootball ? 'bg-[#0f2d52] text-white' : 'bg-orange-600 text-white'}`}>
                                {moment.time}
                              </span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getGradeColor(moment.grade)}`}>
                                {moment.grade}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2">{moment.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedPlayer.keyMoments.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No video clips available for this player
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[#0f2d52] overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2d52] via-[#1a4a7a] to-[#0f2d52] opacity-50" />

        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />

        <div className="relative">
          <Header />

          {/* Hero content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-20 sm:pb-24 lg:pb-32">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 mb-6">
                <span className="text-sm font-medium text-orange-300">
                  Football & Basketball
                </span>
              </div>

              {/* Headline with rotating text */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                Your AI Scouting Assistant
              </h1>
              <p className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-bold text-white/60 flex items-baseline justify-center gap-4">
                <span>For Every</span>
                <RotatingText />
              </p>

              {/* Subheading */}
              <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
                Upload game film. Get detailed scouting reports in minutes.
                AI-powered analysis for coaches who want the edge.
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#0f2d52] bg-white rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Start Analyzing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Play className="mr-2 h-5 w-5" />
                  See How It Works
                </Link>
              </div>

              {/* Social proof */}
              <div className="mt-12 flex items-center justify-center gap-8 text-white/60">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">500+</div>
                  <div className="text-sm">Games Analyzed</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50+</div>
                  <div className="text-sm">Coaches</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">10k+</div>
                  <div className="text-sm">Players Scouted</div>
                </div>
              </div>
            </div>

            {/* Dashboard Preview - now with animation */}
            <div className="mt-16 max-w-5xl mx-auto">
              <AnimatedDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              From upload to scouting report in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload Game Film',
                description: 'Drop in your game footage - MP4, MOV, or link from YouTube/Hudl. Any angle works.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'AI Analyzes Everything',
                description: 'Our AI detects players, tracks movements, identifies plays, and evaluates performance automatically.',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Get Scouting Reports',
                description: 'Receive detailed reports for every player with grades, tendencies, strengths, and areas to develop.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gray-200 -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#0f2d52] mb-6">
                    <item.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-sm font-bold text-[#0f2d52] mb-2">STEP {item.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              What You Get
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Everything a scout sees, powered by AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Auto Player Detection',
                description: 'AI identifies every player on the field by jersey number. No manual tagging required.',
              },
              {
                icon: Target,
                title: 'Position-Specific Analysis',
                description: 'QB reads, WR routes, RB vision, OL technique - analysis tailored to each position.',
              },
              {
                icon: TrendingUp,
                title: 'Tendencies & Patterns',
                description: 'Discover habits opponents can exploit and strengths to build on.',
              },
              {
                icon: BarChart3,
                title: 'Objective Grades',
                description: 'Every player graded on athleticism, technique, decision-making, and consistency.',
              },
              {
                icon: Clock,
                title: 'Key Moments',
                description: 'Highlights and teaching moments auto-clipped with timestamps for film review.',
              },
              {
                icon: Zap,
                title: 'Fast Turnaround',
                description: 'Full game analysis in under an hour. Get reports before your next practice.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-[#0f2d52]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#0f2d52]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Report Section */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Reports That Sound Like a Real Scout
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Not just numbers - you get natural language analysis that identifies what makes
                each player special and what they need to work on.
              </p>
              <ul className="space-y-4">
                {[
                  'Specific play examples with timestamps',
                  'Comparison to level-appropriate benchmarks',
                  'Actionable development recommendations',
                  'Exportable reports for recruiting',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8">
              <div className="border-l-4 border-[#0f2d52] pl-4 mb-6">
                <div className="text-sm font-semibold text-[#0f2d52]">SAMPLE REPORT EXCERPT</div>
              </div>
              <div className="space-y-4 text-gray-700">
                <p className="font-semibold">Strengths:</p>
                <p className="text-sm leading-relaxed">
                  Shows excellent pre-snap recognition, correctly identifying coverage on
                  78% of passing plays. Demonstrates quick release (avg 2.3 sec) and maintains
                  accuracy under pressure. Best throw of the game came at 14:23 - back shoulder
                  fade against tight coverage.
                </p>
                <p className="font-semibold">Areas for Development:</p>
                <p className="text-sm leading-relaxed">
                  Tends to abandon pocket early when first read is covered. On 3rd & long
                  situations, held ball 3.5+ seconds on 6 of 9 plays, resulting in 2 sacks.
                  Recommend drill work on checkdown timing and pocket movement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 sm:py-24 bg-[#0f2d52]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Scout Smarter?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Join coaches who are using AI to find the edge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white text-[#0f2d52] font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors text-lg"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="py-12 lg:py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-xl font-bold text-white">AI Scout</span>
              </div>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">
                AI-powered scouting reports for every player. Upload game film, get professional analysis in minutes.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link href="/features" className="text-sm hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="text-sm hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/sign-up" className="text-sm hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-sm hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2025 AI Scout. All rights reserved.
            </p>
            <p className="text-sm text-gray-500">
              Made for coaches who want the edge.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
