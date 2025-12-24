/**
 * Label Studio API Client
 *
 * Handles integration with Label Studio for player annotation
 * on video clips.
 */

// Lazy load env vars to ensure they're available when needed
const getLabelStudioUrl = () => process.env.LABEL_STUDIO_URL || 'http://localhost:8080';
const getLabelStudioApiKey = () => process.env.LABEL_STUDIO_API_KEY || '';
const getMLBackendUrl = () => process.env.LABEL_STUDIO_ML_BACKEND_URL || '';

// Video labeling config for sports player annotation
// Updated with smart tools for ML-assisted labeling
export const SPORTS_LABELING_CONFIG = `
<View>
  <Header value="Play #$playNumber - Review and correct AI predictions"/>
  <View style="background: #dbeafe; padding: 8px; border-radius: 4px; margin-bottom: 10px;">
    <Text name="hint" value="AI has pre-labeled players. Review, correct, and add missing annotations."/>
  </View>
  <Video name="video" value="$video" framerate="30.0"/>
  <VideoRectangle name="box" toName="video" smart="true" smartOnly="false"/>
  <Labels name="playerLabels" toName="video" allowEmpty="true" showInline="true">
    <Label value="Player" background="#3B82F6"/>
    <Label value="Ball" background="#F59E0B"/>
    <Label value="Referee" background="#10B981"/>
  </Labels>
  <TextArea name="jerseyNumber" toName="video"
    placeholder="Enter jersey number (e.g., 23)"
    perRegion="true" required="false"/>
  <Choices name="team" toName="video" perRegion="true" required="false">
    <Choice value="Home"/>
    <Choice value="Away"/>
  </Choices>
</View>
`;

/**
 * Prediction format for Label Studio
 */
export interface LabelStudioPrediction {
  model_version: string;
  result: Array<{
    id: string;
    type: string;
    from_name: string;
    to_name: string;
    value: {
      sequence: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        frame: number;
        enabled?: boolean;
        rotation?: number;
      }>;
      labels: string[];
    };
    score?: number;
  }>;
}

interface LabelStudioProject {
  id: number;
  title: string;
  created_at: string;
  task_count: number;
}

interface LabelStudioTask {
  id: number;
  data: Record<string, any>;
  annotations: any[];
  predictions: any[];
}

interface CreateTaskData {
  video: string;
  playId: string;
  gameId: string;
  playNumber: number;
  startTime: number;
  endTime: number;
}

class LabelStudioClient {
  private customBaseUrl?: string;
  private customApiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.customBaseUrl = baseUrl;
    this.customApiKey = apiKey;
  }

  private get baseUrl(): string {
    return (this.customBaseUrl || getLabelStudioUrl()).replace(/\/$/, '');
  }

  private get apiKey(): string {
    return this.customApiKey || getLabelStudioApiKey();
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[LabelStudio] ${options.method || 'GET'} ${url}`);

    const headers: Record<string, string> = {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`[LabelStudio] Error: ${response.status} - ${error}`);
      throw new Error(`Label Studio API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Check if Label Studio is connected and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current user info
   */
  async whoami() {
    return this.fetch('/api/current-user/whoami');
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<LabelStudioProject[]> {
    const response = await this.fetch('/api/projects/');
    return response.results || response;
  }

  /**
   * Get or create the AI Scout sports annotation project
   */
  async getOrCreateSportsProject(): Promise<LabelStudioProject> {
    const projects = await this.listProjects();

    // Look for existing AI Scout project
    const existing = projects.find(p => p.title === 'AI Scout - Player Annotation');
    if (existing) {
      return existing;
    }

    // Create new project
    return this.createProject({
      title: 'AI Scout - Player Annotation',
      description: 'Annotate players with bounding boxes, jersey numbers, and team identification',
      label_config: SPORTS_LABELING_CONFIG,
    });
  }

  /**
   * Create a new project
   */
  async createProject(data: {
    title: string;
    description?: string;
    label_config: string;
  }): Promise<LabelStudioProject> {
    return this.fetch('/api/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Import a video clip as a task
   */
  async createTask(projectId: number, taskData: CreateTaskData): Promise<LabelStudioTask> {
    // Import the task
    await this.fetch(`/api/projects/${projectId}/import`, {
      method: 'POST',
      body: JSON.stringify([{
        data: {
          video: taskData.video,
          playId: taskData.playId,
          gameId: taskData.gameId,
          playNumber: taskData.playNumber,
          startTime: taskData.startTime,
          endTime: taskData.endTime,
        },
      }]),
    });

    // Get the task we just created by playId
    const tasks = await this.getTasks(projectId);
    const createdTask = tasks.find((t: any) => t.data?.playId === taskData.playId);

    if (!createdTask) {
      throw new Error('Task was imported but could not be found');
    }

    return createdTask;
  }

  /**
   * Import a video clip as a task WITH pre-annotations from ML model
   *
   * This creates a task where the annotator sees pre-drawn bounding boxes
   * and only needs to correct/refine them instead of drawing from scratch.
   */
  async createTaskWithPredictions(
    projectId: number,
    taskData: CreateTaskData,
    predictions: LabelStudioPrediction
  ): Promise<LabelStudioTask> {
    // Import task with predictions attached
    await this.fetch(`/api/projects/${projectId}/import`, {
      method: 'POST',
      body: JSON.stringify([{
        data: {
          video: taskData.video,
          playId: taskData.playId,
          gameId: taskData.gameId,
          playNumber: taskData.playNumber,
          startTime: taskData.startTime,
          endTime: taskData.endTime,
        },
        predictions: [predictions],
      }]),
    });

    // Get the task we just created by playId
    const tasks = await this.getTasks(projectId);
    const createdTask = tasks.find((t: any) => t.data?.playId === taskData.playId);

    if (!createdTask) {
      throw new Error('Task was imported but could not be found');
    }

    console.log(`[LabelStudio] Created task ${createdTask.id} with ${predictions.result.length} pre-annotations`);

    return createdTask;
  }

  /**
   * Add predictions to an existing task
   */
  async addPredictions(taskId: number, predictions: LabelStudioPrediction): Promise<void> {
    await this.fetch(`/api/predictions/`, {
      method: 'POST',
      body: JSON.stringify({
        task: taskId,
        result: predictions.result,
        model_version: predictions.model_version,
      }),
    });

    console.log(`[LabelStudio] Added ${predictions.result.length} predictions to task ${taskId}`);
  }

  /**
   * Get all tasks for a project
   */
  async getTasks(projectId: number): Promise<LabelStudioTask[]> {
    try {
      const response = await this.fetch(`/api/projects/${projectId}/tasks/`);
      return response.tasks || response || [];
    } catch (error) {
      // Label Studio returns 404 for empty task lists
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTask(taskId: number): Promise<LabelStudioTask> {
    return this.fetch(`/api/tasks/${taskId}/`);
  }

  /**
   * Get completed annotations for a project
   */
  async getAnnotations(projectId: number): Promise<any[]> {
    const response = await this.fetch(`/api/projects/${projectId}/export?exportType=JSON`);
    return response;
  }

  /**
   * Get annotations for a specific task
   */
  async getTaskAnnotations(taskId: number): Promise<any[]> {
    const task = await this.getTask(taskId);
    return task.annotations || [];
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number): Promise<void> {
    await this.fetch(`/api/tasks/${taskId}/`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const labelStudio = new LabelStudioClient();

// Export class for custom instances
export { LabelStudioClient };
