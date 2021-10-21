import passport from 'passport';
import {DoneFunction} from './types';

passport.serializeUser((user: Express.User, done: DoneFunction) => {
  console.log('user', user);
  done(null, user.user_id);
});

passport.deserializeUser((id: string, done: DoneFunction) => {
  console.log('id', id);
  done(null, {user_id: id});
});

export function add_auth_routes(app: any, handlers: any) {
  for (const handler of handlers) {
    app.get(`/auth/${handler}/`, (req: any, res: any) => {
      if (
        typeof req.query?.state === 'string' ||
        typeof req.query?.state === 'undefined'
      ) {
        passport.authenticate(handler)(req, res, (err?: {}) => {
          throw err ?? Error('Authentication failed (next, no error)');
        });
      } else {
        throw Error(
          `state must be a string, or not set, not ${typeof req.query?.state}`
        );
      }
    });

    app.get(
      `/auth-return/${handler}/`,
      passport.authenticate(handler, {
        successRedirect: '/',
        failureRedirect: '/bad',
        failureFlash: true,
        //successFlash: 'Welcome!',
      })
    );
  }
}
