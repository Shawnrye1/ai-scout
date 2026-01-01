CREATE INDEX "detected_players_game_id_idx" ON "detected_players" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "detected_players_team_id_idx" ON "detected_players" USING btree ("detected_team_id");--> statement-breakpoint
CREATE INDEX "detected_teams_game_id_idx" ON "detected_teams" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "detected_teams_user_team_idx" ON "detected_teams" USING btree ("is_user_team");--> statement-breakpoint
CREATE INDEX "key_moments_player_id_idx" ON "key_moments" USING btree ("detected_player_id");--> statement-breakpoint
CREATE INDEX "key_moments_sentiment_idx" ON "key_moments" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "player_analysis_player_id_idx" ON "player_analysis" USING btree ("detected_player_id");--> statement-breakpoint
CREATE INDEX "player_analysis_grade_idx" ON "player_analysis" USING btree ("overall_grade");