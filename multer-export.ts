// UNFORTUNATELY, multer does not export the internal interfaces like File, so this file is to redefine them for improved handling of the code
// If at some point multer exposes them or changes the interfaces, this need to be updated too.
// as of 2020/07, multer is 1.4.3.

import { Readable } from 'stream';

export interface File {
    /** Name of the form field associated with this file. */
    fieldname: string;
    /** Name of the file on the uploader's computer. */
    originalname: string;
    /** Value of the `Content-Type` header for this file. */
    mimetype: string;
    /** Size of the file in bytes. */
    size: number;
    /**
     * A readable stream of this file. Only available to the `_handleFile`
     * callback for custom `StorageEngine`s.
     */
    stream: Readable;
}

export interface Request {
    /** `Multer.File` object populated by `single()` middleware. */
    file: File;
    /**
     * Array or dictionary of `Multer.File` object populated by `array()`,
     * `fields()`, and `any()` middleware.
     */
    files: {
        [fieldname: string]: File[];
    } | File[];
}

export interface CallbackHandleFileOutput {
    path: string;
    size?: number;
}

export interface CallbackHandleFile {
    (err: any, output?: CallbackHandleFileOutput | string | undefined): any
}

export interface CallbackDeleteFile {
    (err: any, output?: any): any
}