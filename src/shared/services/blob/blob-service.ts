export interface BlobService {
  uploadFile(file: any, bucketName: string, expires: Date): Promise<string>;
  // deleteFile(path: string): Promise<void>;
  getFile(fileKey: string, bucketName: string): any;
}
