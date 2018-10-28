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
    groupId?: string[];
    roleId?: string[];
    personaId?: string[];
    organizationId?: string[];
    userName?: string[];
  }
}