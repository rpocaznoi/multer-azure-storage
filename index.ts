import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";
import { Readable } from 'stream';
import { File, Request, CallbackHandleFile } from './multer-export';

export interface Destination {
    path: string;
}

export interface GetDestination {
    (req: Request, file: File): Destination;
}

export class Options {
    azureOptions!: AzureStorageOptions;
    getDestination!: GetDestination;
}

export class AzureStorageOptions {
    constructor(
        public accountName: string,
        public accessKey: string,
        public containerName: string) {
    }

    get url() {
        if (this.accountName.indexOf('http') >= 0) {
            return this.accountName;
        } else {
            return `https://${this.accountName}.blob.core.windows.net`;
        }
    }
}

export class MulterAzureStorage {
    private blobClient: BlobServiceClient;
    private containerClient: ContainerClient;

    constructor(private options: Options) {
        this.blobClient = new BlobServiceClient(
            this.options.azureOptions.url,
            new StorageSharedKeyCredential(
                this.options.azureOptions.accountName,
                this.options.azureOptions.accessKey)
        );

        this.containerClient = this.blobClient.getContainerClient(this.options.azureOptions.containerName);
    }

    _handleFile(req: Request, file: File, cb: CallbackHandleFile) {
        // convert the file into a final path
        const dest = this.options.getDestination(req, file);

        // upload stream to the azure storage
        this.containerClient.getBlockBlobClient(dest.path).uploadStream(file.stream, undefined, undefined, {
            blobHTTPHeaders: {
                blobContentType: file.mimetype
            }
        })
        .then(() => cb(null, { path: dest.path, size: file.size }))
        .catch(cb);
    }

    _removeFile(req: Request, file: File, cb: CallbackHandleFile) {
        // convert the file into a final path
        const dest = this.options.getDestination(req, file);

        this.containerClient.deleteBlob(dest.path)
            .then((res) => cb(null, 'ok'))
            .catch(cb);
    }
}
