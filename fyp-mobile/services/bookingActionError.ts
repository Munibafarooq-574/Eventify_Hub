// Only expose bounded JSON business messages; transport/proxy details stay internal.
export function bookingActionError(error:any,fallback:string):Error {
 const status=error?.response?.status;
 if(status===401)return new Error('Your session has expired. Please sign in again.');
 const raw=error?.response?.data?.message;
 const message=typeof raw==='string'?raw:typeof raw?.message==='string'?raw.message:null;
 if(status>=400&&status<500&&message&&message.length<=500&&!/[<>]|https?:|AxiosError|stack trace/i.test(message))return new Error(message);
 return new Error(fallback);
}
