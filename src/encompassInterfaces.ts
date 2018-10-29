export interface PipeLineContract {
  fields: string[];
  filter?: PipeLineFilter;
  loanGuids?: string[];
  sortOrder?: sortOrderContract[];
}

export interface PipeLineFilter {
  operator: "and" | "or";
  terms: PipeLineTerms[];
}

export interface PipeLineTerms {
  canonicalName: string;
  matchType: "greaterThanOrEquals" | "exact" | "greaterThan" | "isNotEmpty" | "isEmpty" | "lessThan" | "lessThanOrEquals" | "equals" | "notEquals" | "startsWith" | "contains";
  value?: string | number | Date;
  precision?: "exact"| "day" | "month" | "year" | "recurring";
}

export interface sortOrderContract {
  canonicalName: string;
  order: "asc" | "desc";
}

export interface LoanAssociateProperties {
  loanAssociateType: "user" | "group";
  id: string;
  phone?: string;
  cellphone?: string;
  fax?: string;
  email?: string;
}

export interface UserInfoContract {
  viewEmailSignature: boolean;
  start?: number;
  limit?: number | string;
  filter?: {
    groupId?: string[] | number[];
    roleId?: string[];
    personaId?: string[];
    organizationId?: string[] | number[];
    userName?: string[];
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