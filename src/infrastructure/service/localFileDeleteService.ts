import fs from 'fs';
import path from 'path';
import { CommonResponse } from "../dtos/common.dts";

export class LocalFileDeleteService {
  constructor() { }

  async deleteFile(key: string): Promise<CommonResponse> {
    try {
      // If the key is a full URL or path (e.g., /uploads/filename.jpg), extract just the filename
      const filename = path.basename(key);
      const filePath = path.join(__dirname, '../../../public/uploads', filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return { success: true, message: "File deleted successfully!" };
    } catch (error) {
      throw new Error("Failed to delete local file");
    }
  }
}
