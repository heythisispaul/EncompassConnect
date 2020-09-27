import EncompassConnect from './encompassConnect';

export type { Response, RequestInit } from 'node-fetch';
export type {
  EncompassConnectInitOptions,
  PipeLineContract,
  BatchLoanUpdateContract,
  AssignMilestoneOptions,
  UpdateMilestoneOptions,
  LoanUpdateOptions,
  batchUpdateStatus,
  UpdateLoanWithGenerateContract,
  BatchUpdate,
  TokenIntrospection,
} from './types';

export default EncompassConnect;
