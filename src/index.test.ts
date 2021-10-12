import {app} from './routes';
import request from "supertest";

test('check is up', async () => {
    const result = await request(app).get("/up");
    expect(result.statusCode).toEqual(200);
});
