import Express from 'express';
/*
 * Middleware to ensure that the route is only accessible to logged in users
 */
export function requireAuthentication(
    req: Express.Request, res: Express.Response, next: Express.NextFunction
) {
    if (req.user) {
        next();
    } else {
        res.redirect('/auth/');
    }
}
