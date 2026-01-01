import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  jsonb,
  uuid,
  vector,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("member"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeProductId: text("stripe_product_id"),
  planName: varchar("plan_name", { length: 50 }),
  subscriptionStatus: varchar("subscription_status", { length: 20 }),
  // Link to the coach's sports team in the shared database
  sportsTeamId: integer("sports_team_id"), // references sportsTeams.id (added after sportsTeams is defined)
});

// Shared sports team database - all teams (schools, clubs, etc.)
// Any user can search/add teams, reusable across the platform
export const sportsTeams = pgTable("sports_teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Lincoln High School"
  sport: varchar("sport", { length: 20 }).notNull(), // 'basketball', 'football'
  jerseyColorHome: varchar("jersey_color_home", { length: 50 }), // home jersey color
  jerseyColorAway: varchar("jersey_color_away", { length: 50 }), // away jersey color
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  conference: varchar("conference", { length: 100 }),
  division: varchar("division", { length: 50 }), // e.g., "4A", "Division I"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Players in the shared team database
export const sportsTeamPlayers = pgTable("sports_team_players", {
  id: serial("id").primaryKey(),
  sportsTeamId: integer("sports_team_id")
    .notNull()
    .references(() => sportsTeams.id),
  jerseyNumber: integer("jersey_number").notNull(),
  name: varchar("name", { length: 100 }),
  height: varchar("height", { length: 10 }),
  weight: integer("weight"),
  position: varchar("position", { length: 30 }),
  yearGrade: varchar("year_grade", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  role: varchar("role", { length: 50 }).notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  invitedBy: integer("invited_by")
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

export const teamsRelations = relations(teams, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  sportsTeam: one(sportsTeams, {
    fields: [teams.sportsTeamId],
    references: [sportsTeams.id],
  }),
}));

export const sportsTeamsRelations = relations(sportsTeams, ({ many }) => ({
  players: many(sportsTeamPlayers),
}));

export const sportsTeamPlayersRelations = relations(
  sportsTeamPlayers,
  ({ one }) => ({
    sportsTeam: one(sportsTeams, {
      fields: [sportsTeamPlayers.sportsTeamId],
      references: [sportsTeams.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, "id" | "name" | "email">;
  })[];
};

export enum ActivityType {
  SIGN_UP = "SIGN_UP",
  SIGN_IN = "SIGN_IN",
  SIGN_OUT = "SIGN_OUT",
  UPDATE_PASSWORD = "UPDATE_PASSWORD",
  DELETE_ACCOUNT = "DELETE_ACCOUNT",
  UPDATE_ACCOUNT = "UPDATE_ACCOUNT",
  CREATE_TEAM = "CREATE_TEAM",
  REMOVE_TEAM_MEMBER = "REMOVE_TEAM_MEMBER",
  INVITE_TEAM_MEMBER = "INVITE_TEAM_MEMBER",
  ACCEPT_INVITATION = "ACCEPT_INVITATION",
}

// ===========================================
// AI SCOUT SCHEMA
// ===========================================

// Game status enum values
export const gameStatusEnum = [
  "uploading",
  "queued",
  "detecting",
  "tracking",
  "analyzing",
  "ready",
  "failed",
] as const;

export type GameStatus = (typeof gameStatusEnum)[number];

// Sport enum values
export const sportEnum = ["football", "basketball"] as const;
export type Sport = (typeof sportEnum)[number];

// Games - uploaded game films
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }), // display name
  title: varchar("title", { length: 255 }),
  description: text("description"),
  sport: varchar("sport", { length: 20 }), // auto-detected or user-specified
  sportConfidence: decimal("sport_confidence", { precision: 3, scale: 2 }),
  videoUrl: text("video_url"),
  videoSource: varchar("video_source", { length: 20 }), // 'hudl', 'youtube', 'vimeo', 'direct', 'upload'
  videoKey: text("video_key"), // R2 object key
  videoDurationSeconds: integer("video_duration_seconds"),
  videoSizeBytes: integer("video_size_bytes"),
  thumbnailUrl: text("thumbnail_url"),
  status: varchar("status", { length: 20 }).notNull().default("uploading"),
  annotationStatus: varchar("annotation_status", { length: 20 }).default(
    "pending",
  ), // pending, in_progress, reviewed
  processingProgress: integer("processing_progress").default(0),
  processingError: text("processing_error"),
  modalJobId: varchar("modal_job_id", { length: 255 }),
  gameDate: timestamp("game_date"),
  opponent: varchar("opponent", { length: 255 }), // legacy text field
  opponentSportsTeamId: integer("opponent_sports_team_id"), // link to sportsTeams for structured opponent data
  isHomeGame: boolean("is_home_game"), // true = home, false = away
  // Box score text (optional, provided by coach for validation and player name mapping)
  boxScore: text("box_score"),
  // Full Gemini analysis JSON (gameInfo, plays, playerScouting, teamAnalysis, gameFlow, coachingInsights)
  geminiAnalysis: jsonb("gemini_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Detected teams in a game (home/away)
export const detectedTeams = pgTable(
  "detected_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    teamLabel: varchar("team_label", { length: 50 }), // 'home', 'away', 'dark', 'light'
    primaryJerseyColor: varchar("primary_jersey_color", { length: 50 }),
    secondaryJerseyColor: varchar("secondary_jersey_color", { length: 50 }),
    playerCount: integer("player_count"),
    isUserTeam: boolean("is_user_team").default(false),
    teamName: varchar("team_name", { length: 255 }), // user-provided
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    gameIdIdx: index("detected_teams_game_id_idx").on(table.gameId),
    userTeamIdx: index("detected_teams_user_team_idx").on(table.isUserTeam),
  }),
);

// Players detected in a game
export const detectedPlayers = pgTable(
  "detected_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    detectedTeamId: uuid("detected_team_id").references(
      () => detectedTeams.id,
      { onDelete: "cascade" },
    ),
    jerseyNumber: varchar("jersey_number", { length: 10 }),
    jerseyNumberConfidence: decimal("jersey_number_confidence", {
      precision: 3,
      scale: 2,
    }),
    displayName: varchar("display_name", { length: 100 }), // "#23" or user-provided name
    positionGuess: varchar("position_guess", { length: 50 }), // AI-guessed position
    framesVisible: integer("frames_visible"),
    thumbnailUrl: text("thumbnail_url"),
    trackingId: varchar("tracking_id", { length: 50 }), // internal tracking ID
    embedding: vector("embedding", { dimensions: 512 }), // for player similarity search
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    gameIdIdx: index("detected_players_game_id_idx").on(table.gameId),
    teamIdIdx: index("detected_players_team_id_idx").on(table.detectedTeamId),
  }),
);

// Detected plays (football) or possessions (basketball)
export const detectedPlays = pgTable("detected_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  playNumber: integer("play_number"),
  startTimestamp: decimal("start_timestamp", { precision: 10, scale: 2 }),
  endTimestamp: decimal("end_timestamp", { precision: 10, scale: 2 }),
  startTime: integer("start_time"), // alias for easier access
  endTime: integer("end_time"),
  // Football specific
  formation: varchar("formation", { length: 50 }),
  playType: varchar("play_type", { length: 50 }), // 'run', 'pass', 'scramble', 'sack', 'penalty'
  playDirection: varchar("play_direction", { length: 20 }), // 'left', 'middle', 'right'
  yardsGained: integer("yards_gained"),
  down: integer("down"),
  distance: integer("distance"),
  // Basketball specific
  possessionTeamId: uuid("possession_team_id").references(
    () => detectedTeams.id,
  ),
  shotAttempted: boolean("shot_attempted"),
  shotMade: boolean("shot_made"),
  shotType: varchar("shot_type", { length: 50 }), // '3pt', '2pt', 'layup', 'dunk', 'free_throw'
  turnover: boolean("turnover"),
  // General
  thumbnailUrl: text("thumbnail_url"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  needsReview: boolean("needs_review").default(false), // flagged for admin review
  flagReason: text("flag_reason"), // why it was flagged
  rawData: jsonb("raw_data"), // store additional ML output
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Team-level analysis
export const teamAnalysis = pgTable("team_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  detectedTeamId: uuid("detected_team_id")
    .notNull()
    .references(() => detectedTeams.id, { onDelete: "cascade" }),
  formationBreakdown: jsonb("formation_breakdown"), // {"shotgun": 45, "under_center": 30}
  playTypeBreakdown: jsonb("play_type_breakdown"),
  tendencies: jsonb("tendencies"),
  tendenciesReport: text("tendencies_report"), // LLM-generated
  offensiveMetrics: jsonb("offensive_metrics"),
  defensiveMetrics: jsonb("defensive_metrics"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Player-level scouting analysis
export const playerAnalysis = pgTable(
  "player_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    detectedPlayerId: uuid("detected_player_id")
      .notNull()
      .references(() => detectedPlayers.id, { onDelete: "cascade" }),
    overallGrade: decimal("overall_grade", { precision: 4, scale: 1 }),
    metrics: jsonb("metrics"), // all computed metrics
    tendencies: jsonb("tendencies"), // detected patterns
    strengths: jsonb("strengths"), // array of strengths
    developmentAreas: jsonb("development_areas"), // array of areas to improve
    summary: text("summary"), // 2-3 sentence summary
    fullReport: text("full_report"), // LLM-generated scout report
    // Position-specific grades (football)
    athleticismGrade: decimal("athleticism_grade", { precision: 4, scale: 1 }),
    techniqueGrade: decimal("technique_grade", { precision: 4, scale: 1 }),
    decisionMakingGrade: decimal("decision_making_grade", {
      precision: 4,
      scale: 1,
    }),
    consistencyGrade: decimal("consistency_grade", { precision: 4, scale: 1 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    playerIdIdx: index("player_analysis_player_id_idx").on(
      table.detectedPlayerId,
    ),
    gradeIdx: index("player_analysis_grade_idx").on(table.overallGrade),
  }),
);

// Key moments for any player (highlights, teaching moments)
export const keyMoments = pgTable(
  "key_moments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    detectedPlayerId: uuid("detected_player_id")
      .notNull()
      .references(() => detectedPlayers.id, { onDelete: "cascade" }),
    playId: uuid("play_id").references(() => detectedPlays.id, {
      onDelete: "cascade",
    }),
    timestampSeconds: decimal("timestamp_seconds", { precision: 10, scale: 2 }),
    momentType: varchar("moment_type", { length: 50 }), // 'highlight', 'teaching_moment', 'notable'
    sentiment: varchar("sentiment", { length: 20 }), // 'positive', 'negative', 'neutral'
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    clipUrl: text("clip_url"), // short clip of the moment
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    playerIdIdx: index("key_moments_player_id_idx").on(table.detectedPlayerId),
    sentimentIdx: index("key_moments_sentiment_idx").on(table.sentiment),
  }),
);

// Player involvement in plays (many-to-many)
export const playerPlayInvolvement = pgTable("player_play_involvement", {
  id: uuid("id").primaryKey().defaultRandom(),
  detectedPlayerId: uuid("detected_player_id")
    .notNull()
    .references(() => detectedPlayers.id, { onDelete: "cascade" }),
  playId: uuid("play_id")
    .notNull()
    .references(() => detectedPlays.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }), // 'ball_carrier', 'receiver', 'blocker', 'tackler', etc.
  metrics: jsonb("metrics"), // play-specific metrics for this player
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin corrections for model fine-tuning
export const corrections = pgTable("corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  playId: uuid("play_id").references(() => detectedPlays.id, {
    onDelete: "cascade",
  }),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  originalData: jsonb("original_data"), // what the AI detected
  correctedData: jsonb("corrected_data"), // what it should have been
  correctedBy: varchar("corrected_by", { length: 100 }), // admin who made the correction
  correctionType: varchar("correction_type", { length: 50 }), // 'play_type', 'formation', 'player', etc.
  notes: text("notes"),
  usedForTraining: boolean("used_for_training").default(false), // has this been exported for training
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Training runs - track each model training job
export const trainingRuns = pgTable("training_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelType: varchar("model_type", { length: 50 }).notNull(), // 'player_detection', 'play_segmentation', 'play_classification'
  status: varchar("status", { length: 20 }).notNull().default("queued"), // 'queued', 'downloading', 'training', 'validating', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100 completion percentage
  currentEpoch: integer("current_epoch").default(0), // current epoch number
  modalJobId: varchar("modal_job_id", { length: 255 }),
  trainingDataCount: integer("training_data_count"), // number of annotations used
  epochs: integer("epochs").default(50),
  batchSize: integer("batch_size").default(16),
  baseModel: varchar("base_model", { length: 100 }).default("yolov8m.pt"), // pretrained model used
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationSeconds: integer("duration_seconds"),
  errorMessage: text("error_message"),
  trainingConfig: jsonb("training_config"), // additional training parameters
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Model metrics - store real performance metrics per training run
export const modelMetrics = pgTable("model_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainingRunId: uuid("training_run_id")
    .notNull()
    .references(() => trainingRuns.id, { onDelete: "cascade" }),
  modelType: varchar("model_type", { length: 50 }).notNull(),
  version: varchar("version", { length: 20 }), // e.g., 'v1.0.0'
  // Core metrics (0-100 scale for display, stored as decimals)
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  precision: decimal("precision", { precision: 5, scale: 2 }),
  recall: decimal("recall", { precision: 5, scale: 2 }),
  f1Score: decimal("f1_score", { precision: 5, scale: 2 }),
  // Detection-specific metrics
  mAP50: decimal("map50", { precision: 5, scale: 2 }), // mAP at IoU 0.50
  mAP5095: decimal("map50_95", { precision: 5, scale: 2 }), // mAP at IoU 0.50-0.95
  // Training metrics
  trainingLoss: decimal("training_loss", { precision: 10, scale: 6 }),
  validationLoss: decimal("validation_loss", { precision: 10, scale: 6 }),
  // Deployment info
  modelPath: text("model_path"), // R2 path to stored model weights
  modelSizeBytes: integer("model_size_bytes"),
  inferenceTimeMs: integer("inference_time_ms"), // avg inference time
  isProduction: boolean("is_production").default(false), // currently active in production
  deployedAt: timestamp("deployed_at"),
  // Additional details
  classMetrics: jsonb("class_metrics"), // per-class breakdown { player: {...}, ball: {...} }
  confusionMatrix: jsonb("confusion_matrix"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===========================================
// AI SCOUT RELATIONS
// ===========================================

export const gamesRelations = relations(games, ({ one, many }) => ({
  team: one(teams, {
    fields: [games.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
  detectedTeams: many(detectedTeams),
  detectedPlayers: many(detectedPlayers),
  detectedPlays: many(detectedPlays),
}));

export const detectedTeamsRelations = relations(
  detectedTeams,
  ({ one, many }) => ({
    game: one(games, {
      fields: [detectedTeams.gameId],
      references: [games.id],
    }),
    players: many(detectedPlayers),
    analysis: one(teamAnalysis),
  }),
);

export const detectedPlayersRelations = relations(
  detectedPlayers,
  ({ one, many }) => ({
    game: one(games, {
      fields: [detectedPlayers.gameId],
      references: [games.id],
    }),
    detectedTeam: one(detectedTeams, {
      fields: [detectedPlayers.detectedTeamId],
      references: [detectedTeams.id],
    }),
    analysis: one(playerAnalysis),
    keyMoments: many(keyMoments),
    playInvolvements: many(playerPlayInvolvement),
  }),
);

export const detectedPlaysRelations = relations(
  detectedPlays,
  ({ one, many }) => ({
    game: one(games, {
      fields: [detectedPlays.gameId],
      references: [games.id],
    }),
    possessionTeam: one(detectedTeams, {
      fields: [detectedPlays.possessionTeamId],
      references: [detectedTeams.id],
    }),
    playerInvolvements: many(playerPlayInvolvement),
    keyMoments: many(keyMoments),
  }),
);

export const teamAnalysisRelations = relations(teamAnalysis, ({ one }) => ({
  detectedTeam: one(detectedTeams, {
    fields: [teamAnalysis.detectedTeamId],
    references: [detectedTeams.id],
  }),
}));

export const playerAnalysisRelations = relations(playerAnalysis, ({ one }) => ({
  detectedPlayer: one(detectedPlayers, {
    fields: [playerAnalysis.detectedPlayerId],
    references: [detectedPlayers.id],
  }),
}));

export const keyMomentsRelations = relations(keyMoments, ({ one }) => ({
  detectedPlayer: one(detectedPlayers, {
    fields: [keyMoments.detectedPlayerId],
    references: [detectedPlayers.id],
  }),
  play: one(detectedPlays, {
    fields: [keyMoments.playId],
    references: [detectedPlays.id],
  }),
}));

export const playerPlayInvolvementRelations = relations(
  playerPlayInvolvement,
  ({ one }) => ({
    detectedPlayer: one(detectedPlayers, {
      fields: [playerPlayInvolvement.detectedPlayerId],
      references: [detectedPlayers.id],
    }),
    play: one(detectedPlays, {
      fields: [playerPlayInvolvement.playId],
      references: [detectedPlays.id],
    }),
  }),
);

export const trainingRunsRelations = relations(trainingRuns, ({ many }) => ({
  metrics: many(modelMetrics),
}));

export const modelMetricsRelations = relations(modelMetrics, ({ one }) => ({
  trainingRun: one(trainingRuns, {
    fields: [modelMetrics.trainingRunId],
    references: [trainingRuns.id],
  }),
}));

// ===========================================
// AI SCOUT TYPES
// ===========================================

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type DetectedTeam = typeof detectedTeams.$inferSelect;
export type NewDetectedTeam = typeof detectedTeams.$inferInsert;
export type DetectedPlayer = typeof detectedPlayers.$inferSelect;
export type NewDetectedPlayer = typeof detectedPlayers.$inferInsert;
export type DetectedPlay = typeof detectedPlays.$inferSelect;
export type NewDetectedPlay = typeof detectedPlays.$inferInsert;
export type TeamAnalysisType = typeof teamAnalysis.$inferSelect;
export type NewTeamAnalysis = typeof teamAnalysis.$inferInsert;
export type PlayerAnalysisType = typeof playerAnalysis.$inferSelect;
export type NewPlayerAnalysis = typeof playerAnalysis.$inferInsert;
export type KeyMoment = typeof keyMoments.$inferSelect;
export type NewKeyMoment = typeof keyMoments.$inferInsert;
export type Correction = typeof corrections.$inferSelect;
export type NewCorrection = typeof corrections.$inferInsert;
export type TrainingRun = typeof trainingRuns.$inferSelect;
export type NewTrainingRun = typeof trainingRuns.$inferInsert;
export type ModelMetric = typeof modelMetrics.$inferSelect;
export type NewModelMetric = typeof modelMetrics.$inferInsert;

// Sports Team types
export type SportsTeam = typeof sportsTeams.$inferSelect;
export type NewSportsTeam = typeof sportsTeams.$inferInsert;
export type SportsTeamPlayer = typeof sportsTeamPlayers.$inferSelect;
export type NewSportsTeamPlayer = typeof sportsTeamPlayers.$inferInsert;

// ============================================
// GEMINI PROMPT LEARNING & VERSIONING
// ============================================

// Verified examples for few-shot learning
// These are corrections where the event was verified (not rejected)
// Used to include examples in Gemini prompts to improve accuracy
export const verifiedExamples = pgTable("verified_examples", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'scoring', 'rebound', 'steal', 'block', 'assist', 'turnover'
  team: varchar("team", { length: 10 }).notNull(), // 'home' or 'away'
  jerseyNumber: integer("jersey_number"),
  timestamp: varchar("timestamp", { length: 20 }).notNull(), // video timestamp e.g., "2:34"
  timestampSeconds: integer("timestamp_seconds"), // for ordering
  description: text("description").notNull(), // human-readable description
  rawEventData: jsonb("raw_event_data"), // original Gemini output
  verifiedBy: varchar("verified_by", { length: 100 }),
  quality: varchar("quality", { length: 20 }).default("standard"), // 'standard', 'exemplary' - exemplary ones are prioritized
  usedInPromptCount: integer("used_in_prompt_count").default(0), // how many times used
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Prompt versions - track changes to prompts and their effectiveness
export const promptVersions = pgTable("prompt_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentType: varchar("agent_type", { length: 50 }).notNull(), // 'offensive', 'defensive', 'jersey_scan', 'game_flow', 'coaching', 'player_home', 'player_away'
  version: varchar("version", { length: 20 }).notNull(), // e.g., 'v1.0.0'
  promptHash: varchar("prompt_hash", { length: 64 }).notNull(), // SHA256 of prompt content
  promptSummary: text("prompt_summary"), // human-readable summary of changes
  changeReason: text("change_reason"), // why this version was created
  fewShotEnabled: boolean("few_shot_enabled").default(false), // whether few-shot examples are included
  fewShotCount: integer("few_shot_count").default(0), // number of examples included
  // Accuracy metrics (populated after reviews)
  gamesAnalyzed: integer("games_analyzed").default(0),
  eventsDetected: integer("events_detected").default(0),
  eventsVerified: integer("events_verified").default(0),
  eventsRejected: integer("events_rejected").default(0),
  accuracyRate: decimal("accuracy_rate", { precision: 5, scale: 2 }), // calculated: verified / (verified + rejected)
  isActive: boolean("is_active").default(false), // currently in use
  createdAt: timestamp("created_at").notNull().defaultNow(),
  activatedAt: timestamp("activated_at"),
  deactivatedAt: timestamp("deactivated_at"),
});

// Prompt suggestions - generated from rejection patterns
export const promptSuggestions = pgTable("prompt_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  suggestionType: varchar("suggestion_type", { length: 50 }).notNull(), // 'add_constraint', 'add_example', 'clarify_definition', 'raise_threshold'
  priority: varchar("priority", { length: 20 }).default("medium"), // 'low', 'medium', 'high', 'critical'
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  suggestedChange: text("suggested_change"), // actual prompt text to add/change
  basedOnRejections: integer("based_on_rejections").default(0), // how many rejections led to this
  rejectionReasons: jsonb("rejection_reasons"), // breakdown of reasons
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'implemented', 'dismissed'
  implementedInVersion: varchar("implemented_in_version", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 100 }),
});

// Types for new tables
export type VerifiedExample = typeof verifiedExamples.$inferSelect;
export type NewVerifiedExample = typeof verifiedExamples.$inferInsert;
export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;
export type PromptSuggestion = typeof promptSuggestions.$inferSelect;
export type NewPromptSuggestion = typeof promptSuggestions.$inferInsert;
