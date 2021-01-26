import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
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
        if (!dest.connectionString || !dest.containerName) {
            throw new Error('connectionString and containerName are required to be returned from getDestination method');
        }

        if (!dest.blobPath) {
            throw new Error('path is required to be returned from getDestination method');
        }

        return dest;
    }

    private createContainerClient(connectionString: string, containerName: string): ContainerClient {

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        return containerClient;
    }

    private ensureContainer(connectionString: string,  containerName: string): ContainerClient {
        if (!this.options.reuseConnections) {
            return this.createContainerClient(connectionString, containerName);
        }

        const key = connectionString + '-' + containerName;
        if (!this.clients[key]) {
            this.clients[key] = this.createContainerClient(connectionString, containerName);
        }

        return this.clients[key];
    }

    _handleFile(req: any, file: File, cb: CallbackHandleFile) {
        // get the azure storage destination
        const dest = this.validateDestination(this.options.getDestination(req, file));

        const client = this.ensureContainer(dest.connectionString, dest.containerName);

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

        const client = this.ensureContainer(dest.connectionString, dest.containerName);
        client.deleteBlob(dest.blobPath)
            .then((res) => cb(null, 'ok'))
            .catch(cb);
    }
}
