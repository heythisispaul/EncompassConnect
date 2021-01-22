/* eslint-disable camelcase */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * @packageDocumentation
 * @module Interfaces
 */
export interface SortOrderContract {
  canonicalName: string;
  order: 'asc' | 'desc';
}

export interface PipeLineRequest {
  fields?: string[];
  sortOrder?: SortOrderContract[];
}

export interface LoanGuidsPipeLineContract extends PipeLineRequest {
  loanGuids: string[];
}

export interface PipeLineTerms {
  canonicalName: string;
  matchType: 'greaterThanOrEquals' | 'exact' | 'greaterThan' | 'isNotEmpty' | 'isEmpty' | 'lessThan' | 'lessThanOrEquals' | 'equals' | 'notEquals' | 'startsWith' | 'contains';
  value?: string | number | Date;
  precision?: 'exact'| 'day' | 'month' | 'year' | 'recurring';
}

export interface PipeLineFilter {
  operator: 'and' | 'or';
  terms: (PipeLineFilter | PipeLineTerms)[];
}

export interface FilterPipeLineContract extends PipeLineRequest {
  filter: PipeLineFilter;
}

export type PipeLineContract = LoanGuidsPipeLineContract | FilterPipeLineContract;

export interface BatchLoanUpdateContract {
  filter?: PipeLineFilter;
  loanGuids?: string[];
  loanData: any;
}

export interface LoanAssociateProperties {
  loanAssociateType: 'user' | 'group';
  id: string;
  name?: string;
  phone?: string;
  cellphone?: string;
  fax?: string;
  email?: string;
  roleId?: string;
  roleName?: string;
}

export interface UserInfoContract {
  viewEmailSignature?: boolean;
  start?: number;
  limit?: number | string;
  filter?: {
    groupId?: string | number;
    roleId?: string | number;
    personaId?: string | number;
    organizationId?: string | number;
    userName?: string;
  }
}

export interface Organization {
  entityId: string | number;
  entityType: string;
  entityName: string;
  entityUri: string;
}

export interface UserProfile {
  id: string;
  lastName: string;
  firstName: string;
  fullName: string;
  email: string;
  phone: string;
  userIndicators: string[],
  peerLoanAccess: string;
  lastLogin: string | Date;
  encompassVersion: string;
  personalStatusOnline: boolean;
  personas: any[];
  workingFolder?: string;
  organization?: Organization;
  subordinateLoanAccess?: string;
  comments?: string;
  ccSite?: any;
}

export interface LicenseInformation {
  state: string;
  enabled: boolean;
  license?: string;
  expirationDate?: string | Date;
  issueDate?: string | Date;
  startDate?: string | Date;
}

export interface CreateLoanContract {
  view?: 'entity' | 'id';
  loanTemplate?: string;
  loanFolder?: string;
  loan?: any;
}

export interface EncompassConnectInitOptions {
  clientId: string;
  APIsecret: string;
  instanceId: string;
  username?: string;
  password?: string;
  version?: number;
}

export interface InternalRequestOptions {
  isRetry?: boolean;
  isNotJson?: boolean;
  version?: number;
  useTruncatedBase?: boolean;
}

export interface AssignMilestoneOptions {
  loanGuid: string;
  milestone: string;
  userId: string;
}

export interface UpdateMilestoneOptions {
  loanGuid: string;
  milestone: string;
  options: any;
  action?: 'finish' | 'unfinish';
}

export interface LoanUpdateOptions {
  appendData: boolean | string;
  persistent: 'transient' | 'permanent';
  view: 'entity' | 'id';
  loanTemplate?: string;
}

export interface BatchUpdateStatus {
  status: string;
  lastModified: string;
}

export interface BatchUpdate {
  getRequestId: () => string;
  getUpdateStatus: () => Promise<BatchUpdateStatus>;
}

export interface UpdateLoanWithGenerateContract {
  standardFields?: {
    [key: string]: any;
  },
  customFields?: {
    [key: string]: any;
  }
}

export interface TokenIntrospection {
  active: boolean;
  scope: string;
  client_id: string;
  username: string;
  token_type: 'Bearer';
  exp: number;
  sub: string;
  encompass_instance_id: string;
  user_name: string;
  user_key: string;
  encompass_user: string;
  identity_type: 'Enterprise';
  encompass_instance_type: string;
  encompass_client_id: string;
  realm_name: string;
  bearer_token?: string;
}

export interface ListOfUsersOptions {
  viewEmailSignature?: boolean;
  groupId?: string | number;
  roleId?: string;
  personaId?: string | number;
  organizationId?: string | number;
  userName?: string;
  start?: number;
  limit?: number;
}
