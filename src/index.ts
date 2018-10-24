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
}