import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from "@azure/storage-blob";
import { File, CallbackHandleFile, Options, AzureDestination } from './multer-export';

export class MulterAzureStorage {
    private clients: any = {};

    constructor(private options: Options) {
        this.validateOptions(options);
    }

    private validateOptions(options: Options) {
        if (!options.getDestination) {
            throw new Error('options.getDestination is mandatory');
        }

        return options;
    }

    private validateDestination(dest: AzureDestination) {
        if (!dest.accountName || !dest.accessKey || !dest.containerName) {
            throw new Error('accountName, accessKey and containerName are required to be returned from getDestination method');
        }

        if (!dest.blobPath) {
            throw new Error('path is required to be returned from getDestination method');
        }

        return dest;
    }

    private createContainerClient(accountName: string, accessKey: string, containerName: string): ContainerClient {
        let url = accountName;
        if (accountName.indexOf('http') < 0) {
            url = `https://${accountName}.blob.core.windows.net`;
        }

        const blobClient = new BlobServiceClient(
            url,
            new StorageSharedKeyCredential(
                accountName,
                accessKey)
        );

        return blobClient.getContainerClient(containerName);
    }

    private ensureContainer(accountName: string, accessKey: string, containerName: string): ContainerClient {
        if (!this.options.reuseConnections) {
            return this.createContainerClient(accountName, accessKey, containerName);
        }

        const key = accountName + '-' + containerName;
        if (!this.clients[key]) {
            this.clients[key] = this.createContainerClient(accountName, accessKey, containerName);
        }

        return this.clients[key];
    }

    _handleFile(req: any, file: File, cb: CallbackHandleFile) {
        // get the azure storage destination
        const dest = this.validateDestination(this.options.getDestination(req, file));

        const client = this.ensureContainer(dest.accountName, dest.accessKey, dest.containerName);

        // upload stream to the azure storage
        client.getBlockBlobClient(dest.blobPath).uploadStream(file.stream, undefined, undefined, {
            blobHTTPHeaders: {
                blobContentType: file.mimetype
            }
        })
        .then(() => cb(null, { ...dest, size: file.size, mimetype: file.mimetype }))
        .catch(cb);
    }

    _removeFile(req: any, file: File, cb: CallbackHandleFile) {
        // get the azure storage destination
        const dest = this.validateDestination(this.options.getDestination(req, file));

        const client = this.ensureContainer(dest.accountName, dest.accessKey, dest.containerName);
        client.deleteBlob(dest.blobPath)
            .then((res) => cb(null, 'ok'))
            .catch(cb);
    }
}
