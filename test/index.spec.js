const { MulterAzureStorage, AzureStorageOptions } = require('../dist/index');

const Koa = require('koa');
const supertest = require('supertest');

describe('multer azure storage', () => {
    it('upload two files', (done) => {
        const azs = new MulterAzureStorage({
            getDestination: (r, f) => {
                return {
                    accountName: 'your_account_name',
                    accessKey: 'your_accesskey',
                    containerName: 'your_container_name',
                    blobPath: 'dummy/' + f.originalname
                };
            },
        });

        const app = new Koa();
        const Router = require('@koa/router');
        const multer = require('@koa/multer')({ storage: azs });

        const router = new Router();
        router.post('/upload', multer.fields([{ name: 'infiles', maxCount: 2 }]), async ctx => { ctx.body = 'done'; });
        app.use(router.routes());
        app.use(router.allowedMethods());

        // run test
        const srv = app.listen();
        const request = supertest(srv);
        request.post('/upload')
            .attach('infiles', './test/mario.jpg')
            .attach('infiles', './test/mario_luigi.jpg')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    done(err);
                }
                done();
                srv.close();
            });
    })
});
