import { apiClient } from './client';

export interface StrategyExecutorTemplate {
  name: string;
  description: string;
  config_schema: Record<string, any>;
  supported_brokers: string[];
}

export interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export const fetchExecutorTemplates = async (): Promise<StrategyExecutorTemplate[]> => {
  const response = await apiClient.get('/api/v1/strategies/executors/templates');
  return response.data;
};

export const createExecutorStrategy = async (payload: {
  name: string;
  executor_class: string;
  config: Record<string, any>;
  nodes: NodeData[];
  edges: EdgeData[];
}) => {
  const response = await apiClient.post('/api/v1/strategies/executors/create', payload);
  return response.data;
};
