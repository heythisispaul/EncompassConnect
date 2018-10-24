import * as request from 'request';
import { PipeLineContract, MilestoneLogContract } from './encompassInterfaces';

export default class EncompassConnect {
    clientId: string;
    APIsecret: string;
    instanceId: string;
    token: string;

    constructor(clientId: string, APIsecret: string, instanceId: string) {
        this.clientId = clientId;
        this.APIsecret = APIsecret;
        this.instanceId = instanceId;
        this.token = '';
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

    authenticate = (username: string, password: string): Promise<string> => {
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
                if (response.body.access_token) {
                    resolve(response.body.access_token);
                }
                reject('Token request was not rejected - however no token was returned');
            });
        });
    }

    //call immediately after retreiving/updating token to store to the instance.
    storeToken = (token: string) => {
        this.token = token;
    }

    getGuid = (loanNumber: string): Promise<string> => {
        let options = this.callInfo('POST', this.token, {
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

    pipeLineView = (options: PipeLineContract): Promise<any> => {
        let requestOptions = this.callInfo('POST', this.token, options);
        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/encompass/v1/loanPipeline/', requestOptions, (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    //loan CRUD
    getLoan = (GUID: string, loanEntities?: string[]): Promise<any> => {
        let uri = `https://api.elliemae.com/encompass/v1/loans/${GUID}`;
        if (loanEntities) {
            uri += '?entities=';
            loanEntities.forEach((item) => {
                uri += item + ',';
            });
            uri = uri.substring(0, uri.length - 1);
        }
        return new Promise((resolve, reject) => {
            request(uri, this.callInfo('GET', this.token), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                resolve(body);
            });
        });
    }

    //untested as of 10/24
    updateLoan = (GUID: string, loanData: any, loanTemplate?: string): Promise<any> => {
        let uri = `https://api.elliemae.com/encompass/v1/loans/loanId/${GUID}?appendData=true`;
        if (loanTemplate) {
            uri += '?loanTemplate=' + loanTemplate;
        }
        return new Promise((resolve, reject) => {
            request(uri, this.callInfo('PATCH', this.token, loanData), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    deleteLoan = (GUID: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            request(`https://api.elliemae.com/encompass/v1/loans/${GUID}`, this.callInfo('DELETE', this.token), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            });
        });
    }

    //still need create
    //end loan CRUD

    //untested as of 10/24
    //assigns a started date, user, and adds comments to a specified milestone within a loan.
    updateMilestone = (GUID: string, milestone: string, updateTerms: MilestoneLogContract): Promise<any> => {
        return new Promise((resolve, reject) => {
            let milestoneId: string = '';
            request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones`, this.callInfo('GET', this.token), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                try {
                    milestoneId = body.filter((ms: any) => ms.milestoneName == milestone)[0].id;
                }
                catch {
                    reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                }
                let options: any = {
                    startDate: updateTerms.startDate ? updateTerms.startDate : new Date(),
                    loanAssociate: {
                        loanAssociateType: updateTerms.loanAssociateType,
                        userId: updateTerms.userId
                    }
                };
                if (updateTerms.comments) {
                    options.comments = updateTerms.comments;
                }
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/associates/${milestoneId}`, this.callInfo('PATCH', this.token, options), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        });
    }

    //also currently untested (10/24)
    completeMilestone = (GUID: string, milestone: string) => {
        return new Promise((resolve, reject) => {
            let milestoneId: string = '';
            request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones`, this.callInfo('GET', this.token), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                try {
                    milestoneId = body.filter((ms: any) => ms.milestoneName == milestone)[0].id;
                }
                catch {
                    reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                }
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones/${milestoneId}?action=finish`, this.callInfo('PATCH', this.token), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        })
    }
}