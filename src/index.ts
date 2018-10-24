import * as request from 'request';

export default class EncompassConnect {
    clientId: string;
    APIsecret: string;
    instanceId: string;

    constructor(clientId: string, APIsecret: string, instaceId: string) {
        this.clientId = clientId;
        this.APIsecret = APIsecret;
        this.instanceId = instaceId;
    }

    private callInfo = (method: string, token: string, body?: any): any => {
        let options: any = {
            method: method,
            headers: {
                "Authorization": 'Bearer ' + token
            },
            dataType: 'text',
            contentType: 'application/x-www-form-urlencoded',
            json: true
        };
        if (body) {
            options.body = body;
        }
        return options;
    }

    authenticate = (username: string, password: string): Promise<string | boolean> => {
        let auth = "Basic " + Buffer.from(this.clientId + ":" + this.APIsecret).toString('base64');
        let dataString = `grant_type=password&username=${username}@encompass:${this.instanceId}&password=${password}`;
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: 'https://api.elliemae.com/oauth2/v1/token',
                json: true,
                headers: {
                    "Authorization": auth,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: dataString
            },
            (err, response, body) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body.access_token || false);
            });
        });
    }

    getGuid = (token: string, loanNumber: string): Promise<string | boolean> => {
        let options = this.callInfo('POST', token, {
            "filter": {
                "operator": "and",
                "terms": [{
                  canonicalName: "Loan.LoanNumber",
                  value: loanNumber,
                  matchType: "exact"
              }]
            },
            "sortOrder": [
                {
                    "canonicalName": "Loan.LastModified",
                    "order": "desc"
                }
            ],
            "fields": ["Loan.GUID"]
        });

        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/encompass/v1/loanPipeline/', options, (err: any, response: any, body: any) => {
                if (err) {
                    reject(err);
                }
                if (response.body.length > 0) {
                    resolve(response.body[0].loanGuid);
                }
                else {
                    reject(`Loan ${loanNumber} did not return a matching GUID`);
                }
            });
        });
    }

    pipeLineView = (token: string, options: PipeLineContract): Promise<any> => {
        let requestOptions = this.callInfo('POST', token, options);
        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/encompass/v1/loanPipeline/', requestOptions, (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }
}

export interface PipeLineContract {
    filter: {
      operator: "and" | "or";
      terms: PipeLineTerms[];
    },
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