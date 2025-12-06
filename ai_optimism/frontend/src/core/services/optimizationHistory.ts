export interface OptimizationRun {
  id: string;
  problem_id: string;
  session_id: string | null;
  config: {
    population_size: number;
    max_iterations: number;
    convergence_threshold: number;
  };
  heuristic_weights?: Record<string, Record<string, number>>;
  results: {
    results: Array<{
      variables: Record<string, number>;
      score: number;
      objectives: Record<string, number>;
    }>;
    best_design?: {
      variables: Record<string, number>;
      score: number;
      objectives: Record<string, number>;
    };
  };
  heuristic_map?: {
    objectives: string[];
    modifiers: string[];
    weights: Record<string, Record<string, number>>;
  };
  status: 'running' | 'completed' | 'failed';
  started_at: number;
  completed_at: number | null;
  error_message: string | null;
}

export const optimizationHistoryService = {
  async getRunsBySession(sessionId: string, backendApi: { optimization: { getRuns: string } }): Promise<OptimizationRun[]> {
    // Construct URL with query parameter
    const baseUrl = backendApi.optimization.getRuns;
    const url = baseUrl.includes('?') 
      ? `${baseUrl}&session_id=${encodeURIComponent(sessionId)}`
      : `${baseUrl}?session_id=${encodeURIComponent(sessionId)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.message || errorDetail;
      } catch {
        errorDetail = errorText || errorDetail;
      }
      throw new Error(`Failed to fetch optimization runs (${response.status}): ${errorDetail}`);
    }
    return response.json();
  },

  async getAllRuns(backendApi: { optimization: { getRuns: string } }): Promise<OptimizationRun[]> {
    const response = await fetch(backendApi.optimization.getRuns);
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.message || errorDetail;
      } catch {
        errorDetail = errorText || errorDetail;
      }
      throw new Error(`Failed to fetch optimization runs (${response.status}): ${errorDetail}`);
    }
    return response.json();
  },

  async getRun(runId: string, backendApi: { optimization: { getRun: (id: string) => string } }): Promise<OptimizationRun> {
    const response = await fetch(backendApi.optimization.getRun(runId));
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.message || errorDetail;
      } catch {
        errorDetail = errorText || errorDetail;
      }
      throw new Error(`Failed to fetch optimization run (${response.status}): ${errorDetail}`);
    }
    return response.json();
  }
};

