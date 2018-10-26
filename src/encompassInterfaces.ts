export interface PipeLineContract {
    filter?: {
      operator: "and" | "or";
      terms: PipeLineTerms[];
    },
    loanGuids?: string[];
    sortOrder?: sortOrderContract[];
    fields: string[];
  }
  
  export interface PipeLineTerms {
    canonicalName: string;
    matchType: "greaterThanOrEquals" | "exact" | "greaterThan" | "isNotEmpty" | "isEmpty" | "lessThan" | "lessThanOrEquals" | "equals" | "notEquals" | "startsWith" | "contains";
    value?: string | number;
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

  export interface MilestoneLogContract {
      loanAssociateType: "user" | "group";
      userId: string;
      comments?: string;
      startDate?: Date;
      roleRequired?: boolean
  }