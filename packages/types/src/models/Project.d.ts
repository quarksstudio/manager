export interface ProjectInterface {
  id: string;
  parent?: string;
  name: string;
  description: string;
  authors: string[];
  tags: string[];
  files: string[];
  createdAt: Date;
  updatedAt: Date;
}
