export class SignedUrlService {
  constructor(
    private signedUrlRepositoryImpl?: any
  ) { }
  
  async generateSignedUrl(s3Key: string, expires?: number): Promise<string> {
    try {
      if (!s3Key) return "";
      
      // If the file is already a full URL (e.g. Google profile pictures, or old S3 URLs), just return it
      if (s3Key.startsWith("http://") || s3Key.startsWith("https://")) {
        return s3Key;
      }

      // If it's a local filename, prepend the new static API route
      return `/api/uploads/${s3Key}`;
    } catch (error) {
      throw new Error("generateSignedUrl failed")
    }
  }
}
