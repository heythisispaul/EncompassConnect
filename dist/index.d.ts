import { EncompassConnectConstructor, PipeLineContract, BatchLoanUpdateContract, AssignMilestone, UpdateMilestone, LoanUpdateOptions } from './encompassInterfaces';
declare class EncompassConnect {
    #private;
    username: string;
    base: string;
    constructor({ clientId, APIsecret, instanceId, username, password, }: EncompassConnectConstructor);
    setToken(token: string | null): void;
    private withTokenHeader;
    private fetchWithRetry;
    getToken(username?: string, password?: string): Promise<void>;
    getCanonicalNames(): Promise<any>;
    viewPipeline(options: PipeLineContract, limit?: number): Promise<any>;
    batchLoanUpdate(options: BatchLoanUpdateContract): Promise<string>;
    loans: {
        getGuidByLoanNumber: (loanNumber: string) => Promise<string>;
        get: (guid: string, entities: string[]) => Promise<any>;
        update: (guid: string, loanData: any, options?: LoanUpdateOptions | undefined) => Promise<any>;
        delete: (guid: string) => Promise<void>;
    };
    milestones: {
        get: (guid: string) => Promise<any[]>;
        assign: ({ milestone, userId, loanGuid, }: AssignMilestone) => Promise<void>;
        update: ({ loanGuid, milestone, options, action, }: UpdateMilestone) => Promise<void>;
    };
}
export default EncompassConnect;
