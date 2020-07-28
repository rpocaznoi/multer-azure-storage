# Introduction

The original idea came from trying to have either an API or a web application to accept a file upload (one or many files) to take the file from the browser to Azure Storage directly.

Typically, the web applications will take the file from the browser, store it in a temporary file in the server, and from there reach the final storage destination.

Although this in general works very well, it obviously had many disadvantages:
1. The application will download to a temporary location, copy the file to the final destination, and then it has to delete the temp file. Even though this normally works fine, errors can happen, and you could end up with many orphaned temp files taking space in your server hard drive.
2.  In order to execute this process, there are many sub-steps that are executed and actually make it very inefficient:
- T1 upload the file to the server
- T2 store in temp folder
- T3 read the temp file
- T4 send to the final destination
- T5 delete the temp file
- Total = Time the user has to wait for the file(s) to upload and to receive a response that the files were indeed uploaded.

The idea behind this is to try to reduce the most time, while also taking much less memory and CPU.

So in order to do that, we are creating a multer custom storage (following [this](https://github.com/expressjs/multer/blob/master/StorageEngine.md) documentation) that connects directly to `Azure Storage`. Thus, reducing the footprint in the server and also reducing the time that would take the file to reach its final destination.

So the above list of steps would be reduced to:
- T1 upload the file to the server
- T4 send to the final destination

# How to install
To install this package, you can run this command (which also includes `multer`)
```
npm i @juntoz/multer-azure-storage multer
```

# How to use it
First, go to `@koa/multer` and `multer` repos to grasp what they are, and how they are used. They are quite simple and well designed. But it is a prerequisite to understand how this solution works.

Following, a complete example but divided in sections for better explanation.

This first part shows how to create the custom storage. The `getDestination` delegate is important because it will allow the file to be placed in a designated folder if needed.
```
const { MulterAzureStorage, AzureStorageOptions } = require('@juntoz/multer-azure-storage');

const azs = new MulterAzureStorage({
    getDestination: (r, f) => {
        // use this delegate to change the final path for the file
        return {
            path: f.originalname
        };
    },
    azureOptions: new AzureStorageOptions(
        '#your account name#',
        '#your account access key#',
        '#your container name#',
    )
});
```
Then you need to create the `multer` middleware.

NOTE: The examples here are using `koa`, however, since this library is a multer custom storage, it can be used with any other web framework where `multer` can run.

The first line is the important one. @koa/multer will create the middleware for multer and takes in the multer options as its parameter. You use the `storage` field to assign the custom storage instance.

Then, as usual, multer middleware should be injected into a route which we know will be used to upload files along with its corresponding configuration as needed.

In below case, the middleware will run for the multipart form field called 'infiles' and it will allow max 2 files. You can check multer documentation for more options.

```
const multer = require('@koa/multer')({ storage: azs });

const app = new Koa();
const Router = require('@koa/router');

const router = new Router();
router.post(
    '/upload',
    multer.fields([{
        name: 'infiles',
        maxCount: 2
    }]),
    async ctx => { ctx.body = 'done'; }
);
app.use(router.routes());
app.use(router.allowedMethods());
```

And that is all we need. multer will take care of parsing the multipart form and use `busboy` in the background to obtain the file streams in order to read them.

It is at this point where the custom storage will take in the file stream and send it to Azure Storage directly (using the method `uploadStream`). Therefore the stream is never expanded within the application code and is read and written to Azure Storage immediately.

# To test
First, set your testing Azure Storage Container credentials and then run

```
npm test
```

I tried using Azurite as the test container, but couldn't make it work (perhaps it was just a matter of more time to research).

# To improve
As of 2020 July, this library is still evolving. Some of the things that we need to work on:

1. More resilience and better callback and error handling (or at least throwing).
2. Implement backpressure to improve and regulate the flow of bytes from the web to Azure Storage.

Also one more thing, multer does not export some interfaces that we need for more transparency and code insights. So for now, we are "re-exporting" them. For now is ok, but at some point it might break (although I don't expect this to happen neither soon, or perhaps ever).