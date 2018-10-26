import * as request from 'request';
import { PipeLineContract, MilestoneLogContract, LoanAssociateProperties } from './encompassInterfaces';
import { RequestOptions } from 'https';

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

    private utils = {
        callInfo: (method: string, body?: any): RequestOptions => {
            let options: any = {
                method: method,
                headers: {
                    "Authorization": 'Bearer ' + this.token
                },
                dataType: 'text',
                contentType: 'application/x-www-form-urlencoded',
                json: true
            };
            if (body) {
                options.body = body;
            }
            return options;
        },
        getMilestoneId: (GUID: string, milestone: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                let milestoneId: string = '';
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones`, this.utils.callInfo('GET'), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    try {
                        milestoneId = body.filter((ms: any) => ms.milestoneName == milestone)[0].id;
                        resolve(milestoneId);
                    }
                    catch {
                        reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                    }
                });
            })
        }
    }

    authenticate = (username: string, password: string): Promise<request.RequestResponse> => {
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
                    this.token = response.body.access_token;
                    resolve(response);
                }
                reject('Token request was not rejected - however no token was returned');
            });
        });
    }

    getGuid = (loanNumber: string): Promise<string> => {
        let options = this.utils.callInfo('POST', {
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

    pipeLineView = (options: PipeLineContract, limit?: number): Promise<request.RequestResponse> => {
        let requestOptions = this.utils.callInfo('POST', options);
        let uri = 'https://api.elliemae.com/encompass/v1/loanPipeline/';
        if (limit) {
            uri += `?limit=${limit.toString()}`;
        }
        return new Promise((resolve, reject) => {
            request(uri, requestOptions, (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    //loan CRUD
    getLoan = (GUID: string, loanEntities?: string[]): Promise<request.RequestResponse> => {
        let uri = `https://api.elliemae.com/encompass/v1/loans/${GUID}`;
        if (loanEntities) {
            uri += '?entities=';
            loanEntities.forEach((item) => {
                uri += item + ',';
            });
            uri = uri.substring(0, uri.length - 1);
        }
        return new Promise((resolve, reject) => {
            request(uri, this.utils.callInfo('GET'), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    //untested as of 10/24
    updateLoan = (GUID: string, loanData: any, loanTemplate?: string): Promise<request.RequestResponse> => {
        let uri = `https://api.elliemae.com/encompass/v1/loans/loanId/${GUID}?appendData=true`;
        if (loanTemplate) {
            uri += '?loanTemplate=' + loanTemplate;
        }
        return new Promise((resolve, reject) => {
            request(uri, this.utils.callInfo('PATCH', loanData), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    deleteLoan = (GUID: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(`https://api.elliemae.com/encompass/v1/loans/${GUID}`, this.utils.callInfo('DELETE'), (err, response, body) => {
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
    assignUserToMilestone = (GUID: string, milestone: string, userProperties: LoanAssociateProperties): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/associates/${milestoneId}`, this.utils.callInfo('PUT', userProperties), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    //also currently untested (10/24)
    completeMilestone = (GUID: string, milestone: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones/${milestoneId}?action=finish`, this.utils.callInfo('PATCH', { milestoneName: milestone }), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    //this not right maybe? still needs tests ran 10-26
    updateRoleFreeMilestone = (GUID: string, milestone: string, updateInfo: LoanAssociateProperties): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                let options = {
                    loanAssociate: {
                        loanAssociateType: updateInfo.loanAssociateType,
                        userId: updateInfo.id
                    }
                };

                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestoneFreeRoles/${milestoneId}`, this.utils.callInfo('PATCH', options), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }
}