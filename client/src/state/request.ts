var xhrrequest = require('xhr-request');

export default function request<T>(url: string, options: any) {
  return new Promise<T>((resolve, reject) => {
    xhrrequest(url, options, (err, data) => {
      if (err) {
        reject(err); 
      } else {
        resolve(data);
      }
    });
  });
}