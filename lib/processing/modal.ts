/**
 * Modal.com client for triggering video processing
 */

const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT || '';
const MODAL_WEBHOOK_SECRET = process.env.MODAL_WEBHOOK_SECRET || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Roster player info for ML validation
export interface RosterPlayer {
  jerseyNumber: number;
  name: string | null;
  position: string | null;
  height: string | null;
  weight: number | null;
}

// Team roster with jersey color info
export interface TeamRoster {
  teamId: number;
  teamName: string;
  sport: string;
  jerseyColorHome: string | null;
  jerseyColorAway: string | null;
  players: RosterPlayer[];
}

interface ProcessingConfig {
  gameId: string;
  videoUrl: string;
  sport?: string;
  isHomeGame?: boolean;
  homeTeamRoster?: TeamRoster;
  awayTeamRoster?: TeamRoster;
}

/**
 * Trigger video processing on Modal.com
 */
export async function triggerModalProcessing(config: ProcessingConfig): Promise<void> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL}/api/webhooks/modal`;

  const payload = {
    game_id: config.gameId,
    video_url: config.videoUrl,
    webhook_url: webhookUrl,
    webhook_secret: MODAL_WEBHOOK_SECRET,
    sport: config.sport || null,
    anthropic_api_key: ANTHROPIC_API_KEY,
    // Roster data for player identification
    is_home_game: config.isHomeGame ?? null,
    home_team_roster: config.homeTeamRoster ? {
      team_id: config.homeTeamRoster.teamId,
      team_name: config.homeTeamRoster.teamName,
      sport: config.homeTeamRoster.sport,
      jersey_color_home: config.homeTeamRoster.jerseyColorHome,
      jersey_color_away: config.homeTeamRoster.jerseyColorAway,
      players: config.homeTeamRoster.players.map(p => ({
        jersey_number: p.jerseyNumber,
        name: p.name,
        position: p.position,
        height: p.height,
        weight: p.weight,
      })),
    } : null,
    away_team_roster: config.awayTeamRoster ? {
      team_id: config.awayTeamRoster.teamId,
      team_name: config.awayTeamRoster.teamName,
      sport: config.awayTeamRoster.sport,
      jersey_color_home: config.awayTeamRoster.jerseyColorHome,
      jersey_color_away: config.awayTeamRoster.jerseyColorAway,
      players: config.awayTeamRoster.players.map(p => ({
        jersey_number: p.jerseyNumber,
        name: p.name,
        position: p.position,
        height: p.height,
        weight: p.weight,
      })),
    } : null,
  };

  // If Modal endpoint is not configured, skip (for development)
  if (!MODAL_ENDPOINT) {
    console.log('Modal endpoint not configured, skipping processing trigger');
    console.log('Would send payload:', {
      ...payload,
      anthropic_api_key: '***',
      home_team_roster: payload.home_team_roster ? {
        ...payload.home_team_roster,
        players: `[${payload.home_team_roster.players.length} players]`,
      } : null,
      away_team_roster: payload.away_team_roster ? {
        ...payload.away_team_roster,
        players: `[${payload.away_team_roster.players.length} players]`,
      } : null,
    });
    return;
  }

  const response = await fetch(MODAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger Modal processing: ${error}`);
  }
}

/**
 * Check the status of a processing job
 */
export async function getProcessingStatus(gameId: string): Promise<{
  status: string;
  progress: number;
  message?: string;
} | null> {
  // This would query Modal for job status
  // For now, we rely on webhook updates
  return null;
}

/**
 * Retry a failed processing job
 */
export async function retryProcessing(gameId: string, videoUrl: string): Promise<void> {
  return triggerModalProcessing({ gameId, videoUrl });
}
