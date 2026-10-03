export type TaskStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';

export interface WorkflowStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'success' | 'error' | 'skipped';
  detail?: string;
}
