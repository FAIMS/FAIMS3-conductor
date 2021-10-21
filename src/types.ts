import {OAuth2} from 'oauth';


// See https://stackoverflow.com/questions/65772869/how-do-i-type-hint-the-user-argument-when-calling-passport-serializeuser-in-type
declare global {
namespace Express {
  interface User {
    user_id: string;
    user_props?: any;
  }
}
}
export type DoneFunction = (err?: Error | null, profile?: any) => void;
export type UserProfileCallback = (
  oauth: OAuth2,
  accessToken: string,
  done: DoneFunction
) => void;
export type VerifyCallback = (
  err?: Error | null,
  user?: Express.User,
  info?: object
) => void;
