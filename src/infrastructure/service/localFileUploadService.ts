import path from 'path';

export class LocalFileUploadService {
  constructor() { }

  async uploadFile(file: Express.Multer.File): Promise<{ uploadUrl: string; key: string }> {
    try {
      // The file is already saved by multer, we just need to return the URL path.
      // E.g., /uploads/1628123123-filename.jpg
      const uploadUrl = `/uploads/${file.filename}`;
      const key = file.filename;
      
      return { uploadUrl, key };
    } catch (error) {
      throw new Error("Failed to upload local file");
    }
  }
}
