export interface BlobService {
  uploadFile(
    file: any,
    bucketName: string,
    expires?: Date,
    prefix?: string,
  ): Promise<string>;
  getFile(fileKey: string, bucketName: string): any;
  deleteFile(fileKey: string, bucketName: string): Promise<void>;
}
